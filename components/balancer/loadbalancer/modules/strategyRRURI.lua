-- strategyRRURI.lua
module("strategyRRURI", package.seeall)

local utils = require("utils")

-- TODO if SUT servers changed, last_server_by_uri has to be reset

function instance()

    local data = {
        next_server = 0,
        last_server_by_uri = {}
    }

    -- send an equal request always to the other server
    function get_next_endpoint(servers, url)

        local serverCount = count( servers )

        local last_server_index = data.last_server_by_uri[url]

        local next_server_index = nil

        if is_empty(last_server_index) then
            -- pick next server
            next_server_index = data.next_server
        else
            -- pick next server different from last server
            next_server_index = (last_server_index + 1) % serverCount
        end

        -- save new picked server as new last server for this url
        data.last_server_by_uri[url] = next_server_index

        -- get the server object
        local next = servers[next_server_index + 1] -- servers index starts at 1

        -- set next default server
        data.next_server = (data.next_server + 1) % serverCount

        return next

    end

    return { get_next_endpoint = get_next_endpoint }


end

function is_empty(s)
    return s == nil or s == ''
end

function count(servers)
    return utils.tablelength( servers )
end
