import os
import re
import xml.etree.ElementTree as ET
import urllib.request
import urllib.error
import html
import json
import time
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

CACHE_FILE = 'cache.json'
CACHE_EXPIRATION = 3600  # 1 hour
FEED_URL = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'

def strip_html(html_str):
    if not html_str:
        return ""
    # Replace common HTML block elements with space/newline
    text = re.sub(r'</?(p|br|div|li|h[1-6]|ul|ol)>', '\n', html_str)
    # Strip all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities
    text = html.unescape(text)
    # Collapse multiple whitespaces/newlines
    text = re.sub(r'\n\s*\n', '\n', text)
    return text.strip()

def parse_feed():
    try:
        # Request with a User-Agent to avoid potential blocking
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        raise e

    try:
        root = ET.fromstring(xml_data)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        raise e

    NS = {'atom': 'http://www.w3.org/2005/Atom'}
    entries_data = []

    for entry in root.findall('atom:entry', NS):
        # Title of the entry is the date of the release (e.g. "June 15, 2026")
        title_el = entry.find('atom:title', NS)
        date_str = title_el.text.strip() if (title_el is not None and title_el.text is not None) else "Unknown Date"

        # Unique entry ID
        id_el = entry.find('atom:id', NS)
        entry_id = id_el.text.strip() if (id_el is not None and id_el.text is not None) else ""
        # Create a simple safe ID prefix
        safe_prefix = re.sub(r'[^a-zA-Z0-9]', '_', entry_id.split('#')[-1]) if entry_id else "entry"

        # Updated time
        updated_el = entry.find('atom:updated', NS)
        updated_str = updated_el.text.strip() if (updated_el is not None and updated_el.text is not None) else ""

        # Link
        link_el = entry.find('atom:link[@rel="alternate"]', NS)
        if link_el is None:
            link_el = entry.find('atom:link', NS)
        link_str = link_el.attrib.get('href', '') if (link_el is not None and link_el.attrib is not None) else ''

        # HTML content
        content_el = entry.find('atom:content', NS)
        content_str = content_el.text if (content_el is not None and content_el.text is not None) else ""

        updates = []
        if content_str:
            # Split by <h3> headings
            parts = re.split(r'(<h3>.*?</h3>)', content_str)
            
            # If parts[0] is not empty, it contains text before the first <h3>
            if parts[0].strip():
                clean_body = parts[0].strip()
                updates.append({
                    'id': f"{safe_prefix}_intro",
                    'type': 'Notice',
                    'content': clean_body,
                    'text': strip_html(clean_body)
                })

            for i in range(1, len(parts), 2):
                header = parts[i]
                body = parts[i+1] if i+1 < len(parts) else ''
                
                # Extract type from <h3>Type</h3>
                type_match = re.match(r'<h3>(.*?)</h3>', header, re.IGNORECASE)
                update_type = type_match.group(1).strip() if type_match else 'Update'
                
                update_id = f"{safe_prefix}_{i//2}"
                
                updates.append({
                    'id': update_id,
                    'type': update_type,
                    'content': body.strip(),
                    'text': strip_html(body)
                })
        else:
            # Empty content, add placeholder
            updates.append({
                'id': f"{safe_prefix}_empty",
                'type': 'Notice',
                'content': '<p>No details provided.</p>',
                'text': 'No details provided.'
            })

        entries_data.append({
            'date': date_str,
            'updated': updated_str,
            'link': link_str,
            'updates': updates
        })

    return entries_data

def get_notes(force_refresh=False):
    # Check if cache exists and is fresh
    if not force_refresh and os.path.exists(CACHE_FILE):
        file_time = os.path.getmtime(CACHE_FILE)
        if (time.time() - file_time) < CACHE_EXPIRATION:
            try:
                with open(CACHE_FILE, 'r') as f:
                    return json.load(f), "cache"
            except Exception as e:
                print(f"Error reading cache: {e}")
                # Fallback to fetching

    # Otherwise parse fresh data
    try:
        notes = parse_feed()
        try:
            with open(CACHE_FILE, 'w') as f:
                json.dump(notes, f, indent=2)
        except Exception as e:
            print(f"Error writing cache: {e}")
        return notes, "network"
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r') as f:
                    return json.load(f), "cache_fallback"
            except Exception as cache_err:
                print(f"Error reading cache during fallback: {cache_err}")
        raise e


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def api_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes, source = get_notes(force_refresh=force_refresh)
        return jsonify({
            'status': 'success',
            'source': source,
            'data': notes
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
