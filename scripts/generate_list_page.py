# Copyright (c) 2025 Analog Devices, Inc.
# Copyright (c) 2025 Antmicro <www.antmicro.com>
#
# SPDX-License-Identifier: Apache-2.0


"""
The script generating simple HTML file with links to Zephelin Trace Viewer with loaded samples.
"""

import argparse
import sys
from pathlib import Path

# Template with HTML page and simple list
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zephelin Trace Viewer Sample List</title>
  </head>
  <body>
    <h1>Available samples from Zephelin</h1>
    <ul>
      {}
    </ul>
  </body>
</html>
"""

# Template of list item with a link
A_TEMPLATE = '<li><a href="{}">{}</a></li>'

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Script creating a simple HTML page with list of links, "
        "pointing to sample traces visualized with Zephyr Trace Viewer"
    )
    parser.add_argument(
        "traces",
        nargs="+",
        type=Path,
        help="The list of traces available in Zephelin Trace Viewer (in public directory)",
    )
    parser.add_argument(
        "--trace-viewer-url",
        default="./trace_viewer/index.html",
        help="The path to the entrypoint of Zephelin Trace Viewer",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        type=Path,
        help="The path where the created page will be saved",
    )

    args = parser.parse_args(sys.argv[1:])

    links = [
        A_TEMPLATE.format(
            f"{args.trace_viewer_url}#profileURL={t.name}",
            f"{t.stem[4:] if t.stem.startswith('tef_') else t.stem} sample",
        )
        for t in args.traces
    ]
    print(links)

    page = HTML_TEMPLATE.format("\n".join(links))
    print(page)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w") as fd:
        fd.write(page)
