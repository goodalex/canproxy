-- strategyRR.lua
module("strategyRR", package.seeall)

-- implements default round robin strategy

local utils = require("utils")

function instance()

    local data = {
        last_server_index = -1
    }
    
    function get_next_endpoint(servers_avail)
    
        local next_server_index = (data.last_server_index + 1) % count( servers_avail );
    
        local selected = servers_avail[next_server_index + 1] -- servers index starts at 1 instead of 0
    
        data.last_server_index = next_server_index;
    
        return selected
    
    end
    
    function count(servers)
        return utils.tablelength( servers )
    end
    
    function is_empty(s)
        return s == nil or s == ''
    end

    return { get_next_endpoint = get_next_endpoint }

end