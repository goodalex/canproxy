-- config.lua
module("config", package.seeall)

local utils = require("utils")
local servers = require("servers")

local servers_filename = "upstream_endpoints.json"

local initConfig = {

    provisioning = {
        dir = os.getenv( "YWC_PROV_DIR" )
    }

}

local runtime_config = {}

function init() 

    check_env()

    reload_servers()

end


function reload_servers()
   
    math.randomseed( os.time() )

    local input = get_config_for_run_from_file()

    -- validate
    if not input.data then
        ngx.log( ngx.ERR, "servers from file - incorrect format" )
        return nil
    end
--    if not loaded.data['original-clone'] then
--        ngx.log( ngx.ERR, "servers from file - incorrect format" )
--        return nil
--    end
--    if not loaded.data.baseline then
--        ngx.log( ngx.ERR, "servers from file - incorrect format" )
--        return nil
--    end
--    if not loaded.data.canary then
--        ngx.log( ngx.ERR, "servers from file - incorrect format" )
--        return nil
--    end    


    local provisioning_meta = input.meta

    input.meta = {}
    input.meta.provisioning_meta = provisioning_meta
    input.meta.loaded_formatted = os.date("%Y-%m-%d %H:%M:%S")

    runtime_config = input
    
    -- notify
    servers.init()

end

function get_runtime() 
    return runtime_config
end

function check_env() 

    local required_env_vars = {
        "YWC_PROV_DIR"
    }
    
    for i = 1, 1 do
        local key = required_env_vars[i]
        local val = os.getenv( key )
    
        if val == nil then
            ngx.log( ngx.ERR, key .. " must be set" )
        end
    end

end

--
-- expected format in file
--
-- 
--{
--  "meta": (optional)
--  "data": {
--    upstream_servers: {
--      "default": [] (optional)
--      "baseline": [] (optional)
--      "canary": [] (optional)
--    }
--  }
--}
--
-- All fields are theoretically optional, but then server cannot route requests.
-- For the normal use-case "default" must be there before balancer receives requests!
-- (otherwise requests can not be forwareded at all and will result in errors)
--
-- baseline and canary must be there before the performance assessment starts!
-- (otherwise it will not start but keep forwarding 100% of requests to default)
--
function get_config_for_run_from_file()
    local data = utils.loadTable( initConfig.provisioning.dir .. "/" .. servers_filename ) 

    if not data then
        ngx.log( ngx.ERR, "data nil" )
        return nil
    end

    if data and not data.data then
        ngx.log( ngx.ERR, "unexpected format" )
        return nil
    end

    if data and not data.data.upstream_servers then
        ngx.log( ngx.ERR, "unexpected format" )
        return nil
    end

    return data
end





