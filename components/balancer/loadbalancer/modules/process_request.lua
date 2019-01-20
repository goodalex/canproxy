-- Main entrypoint for handlng of HTTP request. 
-- Selects next endpoint by calling a load balancing strategy and assigns the request to the endpoint.
-- Logs the request

local balancer = require "ngx.balancer"
local upstream = require "ngx.upstream"

local core = require("core")
local config = require("config")
local servers = require("servers")
local strategyPA    = require("strategyPA")
local utils = require("utils")

local runtime = {}
local request_processed = false

function store_meta_data(selected_endpoint) 

    ngx.var.ywc_meta_endpoint = selected_endpoint.host .. ":" .. selected_endpoint.port
    ngx.var.ywc_meta_endpoint_type = selected_endpoint.type

end


runtime.selected_endpoint = strategyPA.get_next_endpoint(ngx.var.request_uri)

if not runtime.selected_endpoint then
    ngx.log(ngx.ERR, "runtime.selected_endpoint cannot be nil")
    ngx.log(ngx.ERR, "servers.get(): " .. utils.to_string( servers.get() ) )

end

if runtime.selected_endpoint then

    -- ngx.log(ngx.NOTICE, "runtime.selected_endpoint: " .. utils.to_string( runtime.selected_endpoint ) )

    -- add info header to response
    ngx.header['ywc'] = 'intercepted';

    -- get upstream data and forward request
    local host = runtime.selected_endpoint.host;
    local port = runtime.selected_endpoint.port;

    -- store meta data
    store_meta_data( runtime.selected_endpoint )

    local ok, err = balancer.set_current_peer(host, port)

    -- ngx.log(ngx.NOTICE, "ngx.var.upstream_response_time " .. tonumber(ngx.var.upstream_response_time) )
    -- local resp_time_so_far = ngx.now() - ngx.var.upstream_response_time
    -- ngx.log(ngx.NOTICE, "resp_time_so_far " .. resp_time_so_far )

    -- log / monitor
    if ok then
        request_processed = true
    end
    
    if not ok then
        ngx.log(ngx.ERR, "failed to set the current peer: ", err)
    end

end

if not request_processed then
    ngx.log( ngx.ERR, "failed to process request" )
    return ngx.exit( 500) 
end


