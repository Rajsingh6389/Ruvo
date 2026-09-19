import urllib.request, json, base64

url = 'https://api.razorpay.com/v2/accounts'
payload = {
    'type': 'route',
    'email': 'postmantest129@ruvo.in',
    'phone': '9123456789',
    'legal_business_name': 'Test Ruvo Vendor',
    'business_type': 'proprietorship',
    'profile': {
        'category': 'ecommerce',
        'subcategory': 'ecommerce_marketplace',
        'addresses': {
            'registered': {
                'street1': 'Main Street',
                'street2': 'Area',
                'city': 'Nagpur',
                'state': 'Maharashtra',
                'postal_code': '440022',
                'country': 'IN'
            }
        }
    }
}
data = json.dumps(payload).encode('utf-8')
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + base64.b64encode(b'rzp_live_TYQFq9goHxiw0t:9ZZbCrIc4PQRDOjdTXvYAysH').decode('utf-8')
}

req = urllib.request.Request(url, data=data, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        with open('out.txt', 'w') as f: f.write(resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    with open('out.txt', 'w') as f: f.write(e.read().decode('utf-8'))
