#!/usr/bin/env python3
"""Usage: outside-hosts.py <netlog.json> <site-origin>
Prints the hosts (other than the site itself) that the PAGE asked for, read from a Chrome net-log.
Chrome's own background traffic has no page initiator, so it is ignored."""
import re
import sys
from urllib.parse import urlparse

log, origin = sys.argv[1], sys.argv[2]
text = open(log, encoding="utf-8", errors="ignore").read()
site_host = urlparse(origin).netloc
hosts = set()
# The page's own requests carry "initiator":"<site origin>" and, a few keys later, the url.
pattern = r'"initiator":"' + re.escape(origin) + r'".{0,600}?"url":"(https?://[^"]+)"'
for match in re.finditer(pattern, text):
    host = urlparse(match.group(1)).netloc
    if host and host != site_host and host.split(":")[0] not in ("localhost", "127.0.0.1"):
        hosts.add(host)
print(" ".join(sorted(hosts)))
