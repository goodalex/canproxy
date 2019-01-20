-- memory_requests.lua
module("memory_requests", package.seeall)

local requests = {}

function add(req)
    table.insert( requests, req )
end

function get(req)
    return requests
end

function flush()
    requests = {}
end