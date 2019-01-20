local utils = require("utils")
local requests = require("memory_requests")

local log_data = {
    request_start_time = ngx.req.start_time(),
    request_uri = ngx.var.request_uri,
    endpoint = ngx.var.ywc_meta_endpoint,
    endpoint_type = ngx.var.ywc_meta_endpoint_type,
    response_time_seconds = ngx.var.upstream_response_time
} 

requests.add( log_data )

-- ngx.log(ngx.NOTICE, "log_data " .. utils.to_string( log_data ) )

