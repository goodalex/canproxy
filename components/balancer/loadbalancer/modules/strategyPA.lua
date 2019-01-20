-- strategyPA.lua
module("strategyPA", package.seeall)

-- strategy performance assessment
-- distributes requests between default instances and SUTs according to some weight
-- applies then different strategies depending on target instance type

local config = require("config")
local servers = require("servers")
local strategyRR = require("strategyRR")
local strategyRRURI = require("strategyRRURI")

--local canaryShare = nil
--local totalSutShare = canaryShare * 2;

local strategyRRInstanceDefault = strategyRR.instance()
local strategyRrruriInstance = strategyRRURI.instance()
local strategyRrInstanceSut = strategyRR.instance() -- for tests only


local data = {
    loop_request_count = 0,
    canaryShare = nil,
    totalSutShare = nil,
    -- canaryShare: share of requests that is desired to go to the canary, will bet set during runtime
    -- totalSutShare: share of requests that gets to canary or baseline(=not default), will bet set during runtime
    suts_receive_each_X_request = nil,
    last_send_request_to_suts = nil,
    sut_balancing_strategy = "rruri"
}

-- set the canary share value and every derviced value to to the balancing
function updatePaConfig()

    data.canaryShare = config.get_runtime().data.canary_share
    data.totalSutShare = data.canaryShare * 2
    data.suts_receive_each_X_request = (1 / data.totalSutShare)
    data.sut_balancing_strategy = config.get_runtime().data.sut_balancing_strategy

    if not data.sut_balancing_strategy then
        data.sut_balancing_strategy = "rruri"
    end

end


-- selects a server endpoint from servers
-- depending on the sut share
-- and on the provided request URI
function get_next_endpoint(uri)

    -- decide between production and SUTs
    local send_request_to_suts = weightByRandom()

    if send_request_to_suts == true then

        -- do round robin per URI
        -- between sut servers
        -- ngx.log(ngx.NOTICE, "strategy: assign request to SUT")

        local sut_servers = servers.getServersAllSutTypes()

        
        if data.sut_balancing_strategy == "rruri" then
            return strategyRrruriInstance.get_next_endpoint( sut_servers, uri )

        elseif data.sut_balancing_strategy == "rr" then
            -- for testing with normal round robin to evaluate how workload equivalency is affected
            return strategyRrInstanceSut.get_next_endpoint( sut_servers ) 

        else
            ngx.log( ngx.ERR, "unknown strategy" )
            return nil
        end

    else

        -- do round robin
        -- between default servers
        -- ngx.log(ngx.NOTICE, "strategy: assign request to default")

        local default_servers = servers.getEndpointsByType( 'default' )
        return strategyRRInstanceDefault.get_next_endpoint( default_servers )

    end

end

-- return true if request should be send to SUT
function weightByRandom()

    -- totalSutShare must be in the configuration
    if not data.totalSutShare then
        return false
    else
        return math.random() < data.totalSutShare
    end

end

-- local send_request_to_suts = weightByLoop()
-- something is wrong here, therefore it is not used
-- for usage it is required, to save last decision:
-- -- save last decision
-- data.last_send_request_to_suts = send_request_to_suts
function weightByLoop()

    if not data.suts_receive_each_X_request then
        return false
    end

    local send_request_to_suts = false

    data.loop_request_count = data.loop_request_count + 1 -- increment count

    if (data.loop_request_count % data.suts_receive_each_X_request) < 1 then --
        send_request_to_suts = true
    end

    if (data.loop_request_count >= 100) then -- reset loop
        data.loop_request_count = 0
    end

    return send_request_to_suts
end

function get_data()
    return data
end
