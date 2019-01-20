local requests = require("memory_requests")
local json     = require("json")
local utils    = require("utils")


local method = ngx.var.request_method

if method == "GET" then

    -- raw data
    local requests = requests.get()

    -- data to return
    local requests_page_content = requests
    local last_index =  utils.tablelength( requests_page_content )


    local requests_log = {
        last_entry_index = last_index,
        entryList = requests_page_content
    }

    local json_formatted = json.encode( requests_log )
    ngx.say( json_formatted )

elseif method == "DELETE" then
    requests.flush()
    return ngx.exit(202)
else
    return ngx.exit(500)
end