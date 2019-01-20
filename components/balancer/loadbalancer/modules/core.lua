-- core.lua
module("core", package.seeall)

local servers = require("servers")
local config = require("config")


function init() 

    ngx.log( ngx.NOTICE, "================================================== init balancer core" )

    config.init()
    servers.init()

end

init()


