-- license:MIT
-- copyright-holders: Jeremy Penner
local exports = {
	name = "mamelink",
	version = "0.0.1",
	description = "Socket-based recreation of Lucasfilm's Fastlink interface",
	license = "MIT",
	author = { name = "Jeremy Penner" } 
}

local function readword(bytein)
    local lo = bytein()
    local hi = bytein()
    return lo | (hi << 8)
end

local function fastlink(bytein, byteout)
    print("starting fastlink")
    while true do
        local command = bytein()
        local cpu = manager.machine.devices[":u7"]
        local mem = cpu.spaces.program
        print("Got command", command)
        if command == 0 then -- continue
            manager.machine.debugger:command("go")
        elseif command == 1 then -- pause
            manager.machine.debugger:command("step")
        elseif command == 2 then -- load bytes
            local address = readword(bytein)
            local length = readword(bytein)
            for i = 1, length do
                byteout(mem:read_u8(address + i - 1))
            end
        elseif command == 3 then -- store bytes
            local address = readword(bytein)
            local length = readword(bytein)
            for i = 1, length do
                mem:write_u8(address + i - 1, bytein())
            end
        elseif command == 4 then -- jump
            local address = readword(bytein)
            cpu.state["PC"].value = address
        else 
            print("Unknown command: " .. tostring(command))
        end
    end
end

local function is_booted()
    local cpu = manager.machine.devices[":u7"]
    local mem = cpu.spaces.program
    return mem
end

function exports.startplugin()
    local infilename = manager.plugins["mamelink"].directory .. "/linkin"
    local outfilename = manager.plugins["mamelink"].directory .. "/linkout"
    local pendingfilename = outfilename .. ".pending"

    local link = coroutine.create(fastlink)

    local linkio = {}
    local function bytein()
        while true do
            local data = nil
            if linkio.infile then
                data = linkio.infile:read(1)
            end
            if data then
                return string.byte(data)
            else
                coroutine.yield()
            end
        end
    end
    local function byteout(byte)
        io.outfile:write(string.char(byte))
    end

    print(coroutine.resume(link, bytein, byteout))

    emu.register_periodic(function()
        if not is_booted() then return end
        linkio.infile = io.open(infilename, "rb")
        if linkio.infile then
            linkio.outfile = io.open(pendingfilename, "wb")
            print(coroutine.resume(link))
            linkio.infile:close()
            linkio.infile = nil
            linkio.outfile:close()
            linkio.outfile = nil
            os.rename(pendingfilename, outfilename)
            os.remove(infilename)
        end
    end)
end

return exports