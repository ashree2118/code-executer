local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call("ZREMRANGEBYSCORE", key, 0, now - window_ms)

local request_count = redis.call("ZCARD", key)
if request_count >= limit then
  return 0
end

redis.call("ZADD", key, now, member)
redis.call("PEXPIRE", key, window_ms)

return 1
