
local config = require("config")
local strategyPA = require("strategyPA")

-- whole process reload 
-- aim: make use of nginx creating a new process, request handover and reload of whole config 
-- problem: reload command received but nothing happens... because of docker?

-- cmd = os.getenv( "START_CMD" )
-- os.execute( cmd .. " -s reload" ) 

-- alternative to nginx reload
-- internal servers reload
config.reload_servers()
strategyPA.updatePaConfig()