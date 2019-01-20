
local config        = require("config")
local servers       = require("servers")
local json          = require("json")
local strategyPA    = require("strategyPA")


local status = { 
    config = config.get_runtime(),
    strategyPA = strategyPA.get_data()
}


local statusJson = json.encode( status )


ngx.say( statusJson )