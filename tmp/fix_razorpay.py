import re

file_path = r'C:\Users\rm273\Downloads\RuVo\ruvo\src\main\java\Ranex\ruvo\service\RazorpayRouteService.java'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all Errror connecting to Razorpay typo with just a re-thrown error message
content = re.sub(
    r'throw new RuntimeException\("Errror connecting to Razorpay: " \+ e\.getMessage\(\)\);',
    r'throw new RuntimeException(e.getMessage());',
    content
)

content = re.sub(
    r'throw new RuntimeException\("Failed to create Razorpay Stakeholder: " \+ e\.getMessage\(\)\);',
    r'throw new RuntimeException(e.getMessage());',
    content
)

content = re.sub(
    r'throw new RuntimeException\("Exception requesting Route Product: " \+ e\.getMessage\(\)\);',
    r'throw new RuntimeException(e.getMessage());',
    content
)

content = re.sub(
    r'throw new RuntimeException\("Failed to update Razorpay onboarding: " \+ e\.getMessage\(\), e\);',
    r'throw new RuntimeException(e.getMessage(), e);',
    content
)

content = re.sub(
    r'throw new RuntimeException\("Failed to submit Bank details to Razorpay: " \+ e\.getMessage\(\)\);',
    r'throw new RuntimeException(e.getMessage());',
    content
)

content = re.sub(
    r'throw new RuntimeException\("Failed to submit Bank details: " \+ e\.getMessage\(\)\);',
    r'throw new RuntimeException(e.getMessage());',
    content
)

# Fix the catch exceptions to rethrow RuntimeExceptions
content = content.replace(
    '} catch (Exception e) {',
    '} catch (RuntimeException re) {\n                throw re;\n            } catch (Exception e) {'
)

# Now inject the extractRazorpayError helper near the end of the file
helper_method = """
    private String extractRazorpayError(String responseBody, String defaultMsg) {
        if (responseBody == null || responseBody.isBlank()) return defaultMsg;
        try {
            JSONObject json = new JSONObject(responseBody);
            if (json.has("error")) {
                JSONObject err = json.getJSONObject("error");
                String desc = err.optString("description", "");
                if (desc.toLowerCase().contains("authentication failed")) {
                    return "Razorpay Integration Failed: Invalid API Keys. Please contact Admin.";
                }
                return desc.isBlank() ? defaultMsg + ": " + responseBody : defaultMsg + ": " + desc;
            }
        } catch (Exception ignored) {}
        return defaultMsg + ": " + responseBody;
    }
"""

# Replace all the throw new RuntimeException("... " + response.body) with the helper
content = re.sub(
    r'throw new RuntimeException\("([^"]+) " \+ response\.body\);',
    r'throw new RuntimeException(extractRazorpayError(response.body, "\1"));',
    content
)
content = re.sub(
    r'throw new RuntimeException\("([^"]+): " \+ response\.body\);',
    r'throw new RuntimeException(extractRazorpayError(response.body, "\1"));',
    content
)

content = content.replace('private HttpResponse executeRazorpayApi', helper_method + '\n    private HttpResponse executeRazorpayApi')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated RazorpayRouteService.java")
