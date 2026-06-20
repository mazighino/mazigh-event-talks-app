import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
import time
import re
import copy
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Cache structure to keep load times snappy
cache = {
    'data': None,
    'last_updated': 0
}
CACHE_TTL = 300  # 5 minutes in seconds

def split_entry_updates(entry_id, formatted_date, raw_date, content_html):
    """
    Splits an entry's HTML content by <h3> headers to extract individual updates.
    """
    if not content_html:
        return []
        
    soup = BeautifulSoup(content_html, 'html.parser')
    h3s = soup.find_all('h3')
    
    if not h3s:
        # If there are no h3 tags, treat the entire entry as a single update
        return [{
            'id': f"{entry_id}#update",
            'date': formatted_date,
            'raw_date': raw_date,
            'type': 'Update',
            'content': content_html.strip(),
            'text_content': soup.get_text().strip()
        }]
        
    updates = []
    for i, h3 in enumerate(h3s):
        update_type = h3.get_text().strip()
        
        # Gather all following siblings until the next h3 tag
        siblings = []
        for sibling in h3.next_siblings:
            if sibling.name == 'h3':
                break
            siblings.append(sibling)
            
        # Re-compile siblings into HTML string
        update_soup = BeautifulSoup('', 'html.parser')
        for sib in siblings:
            update_soup.append(copy.copy(sib))
            
        update_html = str(update_soup).strip()
        text_content = update_soup.get_text().strip()
        
        # Generate a unique stable ID for this update
        clean_type = re.sub(r'[^a-zA-Z0-9-]', '', update_type.lower())
        update_id = f"{entry_id}#{clean_type}-{i}"
        
        updates.append({
            'id': update_id,
            'date': formatted_date,
            'raw_date': raw_date,
            'type': update_type,
            'content': update_html,
            'text_content': text_content
        })
        
    return updates

def fetch_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    )
    
    with urllib.request.urlopen(req, timeout=12) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', namespaces)
    all_updates = []
    
    for entry in entries:
        title_date = entry.find('atom:title', namespaces).text
        updated_raw = entry.find('atom:updated', namespaces).text
        entry_id = entry.find('atom:id', namespaces).text
        
        # Format the date nicely (e.g., "June 17, 2026")
        try:
            # Parse ISO 8601 offset strings in standard python datetime
            # Python's fromisoformat parses 2026-06-17T00:00:00-07:00 correctly
            dt = datetime.fromisoformat(updated_raw)
            formatted_date = dt.strftime('%B %d, %Y')
        except Exception:
            formatted_date = title_date
            
        content_elem = entry.find('atom:content', namespaces)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split entry into distinct updates
        entry_updates = split_entry_updates(entry_id, formatted_date, updated_raw, content_html)
        all_updates.extend(entry_updates)
        
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def api_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check if cache is fresh and force refresh not requested
    if not force_refresh and cache['data'] is not None and (current_time - cache['last_updated'] < CACHE_TTL):
        return jsonify({
            'updates': cache['data'],
            'cached': True,
            'last_updated': cache['last_updated']
        })
        
    try:
        updates = fetch_release_notes()
        
        # Update cache
        cache['data'] = updates
        cache['last_updated'] = current_time
        
        return jsonify({
            'updates': updates,
            'cached': False,
            'last_updated': current_time
        })
    except Exception as e:
        print(f"Error fetching/parsing release notes: {e}")
        # If fetch fails but we have stale cache, fall back to it
        if cache['data'] is not None:
            return jsonify({
                'updates': cache['data'],
                'cached': True,
                'last_updated': cache['last_updated'],
                'fallback_warning': True,
                'error': str(e)
            })
            
        return jsonify({
            'error': f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Listen on port 5000 by default
    app.run(host='127.0.0.1', port=5000, debug=True)
