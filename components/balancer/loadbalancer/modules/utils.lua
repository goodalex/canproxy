-- utils.lua
module("utils", package.seeall)

local json = require("json")

function tablelength(T)
    local count = 0
    for _ in pairs(T) do count = count + 1 end
    return count
end

-- http://lua-users.org/wiki/TableSerialization
function table_print (tt, indent, done)
    done = done or {}
    indent = indent or 0
    if type(tt) == "table" then
      local sb = {}
      for key, value in pairs (tt) do
        table.insert(sb, string.rep (" ", indent)) -- indent it
        if type (value) == "table" and not done [value] then
          done [value] = true
          table.insert(sb, "{\n");
          table.insert(sb, table_print (value, indent + 2, done))
          table.insert(sb, string.rep (" ", indent)) -- indent it
          table.insert(sb, "}\n");
        elseif "number" == type(key) then
          table.insert(sb, string.format("\"%s\"\n", tostring(value)))
        else
          table.insert(sb, string.format(
              "%s = \"%s\"\n", tostring (key), tostring(value)))
         end
      end
      return table.concat(sb)
    else
      return tt .. "\n"
    end
  end
  
  function to_string( tbl )
      if  "nil"       == type( tbl ) then
          return tostring(nil)
      elseif  "table" == type( tbl ) then
          return table_print(tbl)
      elseif  "string" == type( tbl ) then
          return tbl
      else
          return tostring(tbl)
      end
  end

  function loadTable(filepath)

    ngx.log( ngx.NOTICE, "attempting to load table from " .. filepath )

    local contents = ""
    local myTable = {}
    local file = io.open( filepath, "r" )
    if file then
        --print("trying to read ", filename)
        -- read all contents of file into a string
        local contents = file:read( "*a" )
        myTable = json.decode(contents);
        io.close( file )
        print("Loaded file")
        print( contents )
        print( to_string(myTable) )
        print( to_string(myTable.data) )
        return myTable
    end
    print(filepath, "file not found")
    return nil
end