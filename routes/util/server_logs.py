import sys
import datetime
import re
from pytz import timezone

def convert_time(dt, tz):
    fmt = "%b %d, %Y %-I:%M:%S%p "
    tzinfo = timezone(tz)
    return dt.astimezone(tzinfo).strftime(fmt) + tzinfo.tzname(dt)

def validate_iso8601(str_val):
    regex = r'^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[01][0-9]):[0-5][0-9])?$'
    match_iso8601 = re.compile(regex).match
    try:            
        if match_iso8601( str_val ) is not None:
            return True
    except:
        pass
    return False

for line in sys.stdin:
    parts = line.split(" ")
    potential_timestamp = parts[0]
    if(validate_iso8601(potential_timestamp) ):
        date_obj = datetime.datetime.strptime(potential_timestamp.replace("+00:00",""),  "%Y-%m-%dT%H:%M:%S.%f")
        parts[0] = convert_time(date_obj,"US/Eastern")
        sys.stdout.write(" ".join(parts)[0:100])
    