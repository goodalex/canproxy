-- servers.lua
module("servers", package.seeall)

local utils = require("utils")
local config = require("config")

local data = {

}

function init()

    data.servers = config.get_runtime().data.upstream_servers
    
end

function count()
    return countDefault() + countBaseline() + countCanary()
end

function getEndpointsByType(type)
    if not data.servers then
        return nil
    end

    if not data.servers[type] then
        return nil
    end

    if not data.servers[type].endpoints then
        return nil
    end

    local endpoints = data.servers[type].endpoints

    -- add meta infos to each endpoint
    for key,value in pairs( endpoints ) do
        value.type = type
    end

    return data.servers[type].endpoints
end

function getServers()

    local allServers = {}

    for k1,v in pairs(data.servers) do
        for k2, endpoint in pairs(v.endpoints) do
            table.insert( allServers, endpoint )
        end
    end

    -- utils.table_print( allServers );

    return allServers;

end

function getServersAllSutTypes() 

    -- get canary and baseline servers

    local canary_servers    = getEndpointsByType( 'canary' )
    local baseline_servers  = getEndpointsByType( 'baseline' )

    local sut_servers = {}

    for k, v in pairs(canary_servers) do
        table.insert( sut_servers, v )
    end
    for k, v in pairs(baseline_servers) do
        table.insert( sut_servers, v )
    end

    return sut_servers

end

function countServerType(type)
    local servers = getEndpointsByType(type);

    if not servers then
        return 0
    end

    return utils.tablelength( servers )
end

function countDefault()
    return countServerType('default')
end

function countBaseline()
    return countServerType('baseline')
end

function countCanary()
    return countServerType('canary')
end


