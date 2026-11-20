import os
import base64
import subprocess

with open('public/svaasth.png', 'rb') as f:
    svaasth_logo_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WhatsApp Cloud API - Client Onboarding Requirements</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 12mm 14mm 12mm 14mm;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a202c;
    background: #ffffff;
    font-size: 8.8pt;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  .page {{
    page-break-after: always;
    break-after: page;
    min-height: 270mm;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  .page-last {{
    page-break-after: avoid;
    break-after: avoid;
  }}

  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #176e56;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }}

  .header-logo {{
    height: 34px;
    object-fit: contain;
  }}

  .doc-meta {{
    text-align: right;
  }}

  .doc-tag {{
    display: inline-block;
    background: #eaf5ef;
    color: #176e56;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2.5px 8px;
    border-radius: 4px;
    margin-bottom: 2px;
  }}

  .doc-date {{
    font-size: 7.5pt;
    color: #718096;
  }}

  .title-block {{
    margin-bottom: 12px;
  }}

  h1 {{
    font-size: 15pt;
    font-weight: 800;
    color: #0f4435;
    letter-spacing: -0.3px;
    margin-bottom: 3px;
  }}

  .subtitle {{
    font-size: 8.5pt;
    color: #4a5568;
    line-height: 1.35;
  }}

  .overview-card {{
    background: #f7faf8;
    border-left: 3.5px solid #176e56;
    border-radius: 0 6px 6px 0;
    padding: 8px 12px;
    margin-bottom: 14px;
    display: flex;
    gap: 12px;
  }}

  .overview-col {{
    flex: 1;
  }}

  .overview-title {{
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #176e56;
    margin-bottom: 2px;
  }}

  .overview-text {{
    font-size: 8pt;
    color: #2d3748;
  }}

  .section {{
    margin-bottom: 12px;
  }}

  .section-header {{
    display: flex;
    align-items: center;
    gap: 7px;
    background: #edf7f2;
    padding: 5px 9px;
    border-radius: 5px;
    margin-bottom: 6px;
    border: 1px solid #d4ebdf;
  }}

  .section-num {{
    width: 18px;
    height: 18px;
    background: #176e56;
    color: #fff;
    font-weight: 800;
    font-size: 8pt;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .section-title {{
    font-size: 9.8pt;
    font-weight: 700;
    color: #0f4435;
  }}

  .section-badge {{
    margin-left: auto;
    font-size: 6.5pt;
    font-weight: 700;
    padding: 1.5px 5.5px;
    border-radius: 4px;
    text-transform: uppercase;
  }}

  .badge-mandatory {{
    background: #fed7d7;
    color: #9b2c2c;
  }}

  .badge-action {{
    background: #feebc8;
    color: #7b341e;
  }}

  .badge-info {{
    background: #e2e8f0;
    color: #4a5568;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 8.2pt;
  }}

  th {{
    background: #f1f5f3;
    color: #2d3748;
    font-weight: 700;
    text-align: left;
    padding: 5px 7px;
    border-bottom: 1.5px solid #cbd5e0;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}

  td {{
    padding: 5px 7px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
    color: #2d3748;
  }}

  tr:nth-child(even) {{
    background: #fafcfb;
  }}

  .item-name {{
    font-weight: 700;
    color: #1a202c;
  }}

  .item-desc {{
    font-size: 7.8pt;
    color: #4a5568;
    margin-top: 1px;
  }}

  .danger-box {{
    background: #fff5f5;
    border: 1px solid #feb2b2;
    border-radius: 5px;
    padding: 6px 9px;
    margin: 6px 0;
    font-size: 8pt;
    color: #9b2c2c;
  }}

  .danger-box strong {{
    color: #c53030;
  }}

  .action-box {{
    background: #fffdf5;
    border: 1px solid #f6e05e;
    border-radius: 5px;
    padding: 6px 9px;
    margin: 6px 0;
    font-size: 8pt;
  }}

  .action-box strong {{
    color: #744210;
  }}

  .check-table th {{
    background: #176e56;
    color: #ffffff;
    font-size: 7.5pt;
  }}

  .box-cell {{
    width: 22px;
    text-align: center;
  }}

  .checkbox {{
    width: 12px;
    height: 12px;
    border: 1.5px solid #a0aec0;
    border-radius: 3px;
    display: inline-block;
  }}

  .fill-line {{
    border-bottom: 1px dotted #a0aec0;
    min-height: 14px;
    color: #718096;
    font-style: italic;
    font-size: 7.5pt;
  }}

  .footer-bar {{
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
    color: #718096;
    margin-top: auto;
  }}

  .contact-badge {{
    font-weight: 700;
    color: #176e56;
  }}
</style>
</head>
<body>

  <!-- ==================== PAGE 1: CORE ACCOUNTS & NUMBER ==================== -->
  <div class="page">
    <div>
      <div class="header">
        <img src="data:image/png;base64,{svaasth_logo_b64}" class="header-logo" alt="Svaasth Logo">
        <div class="doc-meta">
          <div class="doc-tag">Client Onboarding</div>
          <div class="doc-date">Checklist &amp; Setup Requirements</div>
        </div>
      </div>

      <div class="title-block">
        <h1>WhatsApp Cloud API – Client Onboarding Checklist</h1>
        <p class="subtitle">Complete technical credentials, phone lines, legal KYC documents, and clinic details required from the hospital/business management to launch official WhatsApp patient automation.</p>
      </div>

      <div class="overview-card">
        <div class="overview-col">
          <div class="overview-title">⏱️ Fast Turnaround</div>
          <div class="overview-text"><strong>24 – 48 Hours</strong> setup once the prerequisites below are provided by your team.</div>
        </div>
        <div class="overview-col">
          <div class="overview-title">🛡️ Official Meta Cloud API</div>
          <div class="overview-text">100% compliant with Meta Business Policies. Zero ban risk, verified enterprise encryption.</div>
        </div>
        <div class="overview-col">
          <div class="overview-title">📞 Verification OTP</div>
          <div class="overview-text">Requires a one-time <strong>6-digit SMS or Voice OTP</strong> on the hospital number during linking.</div>
        </div>
      </div>

      <!-- SECTION 1 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">1</div>
          <div class="section-title">Meta Business Portfolio &amp; Facebook Access</div>
          <div class="section-badge badge-mandatory">Mandatory</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Requirement</th>
              <th style="width: 44%;">Description &amp; Specifications</th>
              <th style="width: 28%;">How to Provide</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="item-name">Facebook Personal Account</td>
              <td>An active personal Facebook profile of the hospital director, owner, or IT administrator. Needed to manage Meta business assets.</td>
              <td>Admin email ID associated with the Facebook account.</td>
            </tr>
            <tr>
              <td class="item-name">Meta Business Portfolio</td>
              <td>Access to <strong>business.facebook.com</strong> under the hospital's registered legal entity name.</td>
              <td>Invite our tech team as <em>Admin</em> or <em>Partner</em> (Business ID will be shared).</td>
            </tr>
            <tr>
              <td class="item-name">Official Facebook Page</td>
              <td>Hospital/Clinic's official Facebook Page connected to the Business Portfolio.</td>
              <td>Facebook Page URL + Admin role assignment.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 2 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">2</div>
          <div class="section-title">Dedicated WhatsApp Phone Number</div>
          <div class="section-badge badge-mandatory">Mandatory</div>
        </div>

        <div class="danger-box">
          <strong>CRITICAL PHONE NUMBER REQUIREMENT:</strong> The phone number to be linked <u>MUST NOT</u> have an active account on the regular WhatsApp consumer app or WhatsApp Business mobile app at the time of linking.
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Requirement</th>
              <th style="width: 44%;">Description &amp; Specifications</th>
              <th style="width: 28%;">Client Action Needed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="item-name">Number Type</td>
              <td>Any valid mobile number, SIM card, virtual number, or landline number with STD code.</td>
              <td>Share the 10-digit number (e.g., <code>+91 9373280505</code> or <code>07152-255795</code>).</td>
            </tr>
            <tr>
              <td class="item-name">OTP Reception (SMS / Call)</td>
              <td>During initial Meta connection, Meta sends a 6-digit verification code. The phone must be powered ON and staffed.</td>
              <td>Designate an on-call coordinator available for 10 minutes to convey OTP to our team.</td>
            </tr>
            <tr>
              <td class="item-name">Deregistering Existing WhatsApp</td>
              <td>If this number is currently in use on a phone via WhatsApp Business App, it must be deleted from the app: <em>Settings ➔ Account ➔ Delete my account</em>.</td>
              <td>Backup chats first if desired, then delete the in-app account so Meta Cloud API can claim the line.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer-bar">
      <div><strong>Svaasth Connect</strong> – Hospital Management &amp; Patient AI System</div>
      <div>Page 1 of 3</div>
    </div>
  </div>

  <!-- ==================== PAGE 2: PROFILE, KYC & BILLING ==================== -->
  <div class="page">
    <div>
      <div class="header">
        <img src="data:image/png;base64,{svaasth_logo_b64}" class="header-logo" alt="Svaasth Logo">
        <div class="doc-meta">
          <div class="doc-tag">Verification &amp; Profile</div>
          <div class="doc-date">Profile, KYC &amp; Billing</div>
        </div>
      </div>

      <!-- SECTION 3 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">3</div>
          <div class="section-title">Official WhatsApp Profile Information</div>
          <div class="section-badge badge-mandatory">Mandatory</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Field Name</th>
              <th style="width: 44%;">Guidelines &amp; Requirements</th>
              <th style="width: 28%;">Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="item-name">Display Name</td>
              <td>Must closely match the legal business name, brand trademark, or hospital signboard. Meta rejects random names.</td>
              <td><code>Cortex Hospital Wardha</code> or <code>Svaasth City Clinic</code></td>
            </tr>
            <tr>
              <td class="item-name">Profile Picture (Logo)</td>
              <td>Square image (minimum 512×512 px) in PNG or high-res JPG format. Clean hospital emblem/crest.</td>
              <td>Provide square logo file (PNG).</td>
            </tr>
            <tr>
              <td class="item-name">Business Category</td>
              <td>Primary category for Meta WhatsApp directory listing.</td>
              <td><code>Medical &amp; Health</code> or <code>Hospital</code></td>
            </tr>
            <tr>
              <td class="item-name">About / Bio</td>
              <td>Short status text displayed in WhatsApp profile (up to 138 characters).</td>
              <td><em>"Official 24/7 OPD Appointments &amp; Patient Helpline for Cortex Hospital."</em></td>
            </tr>
            <tr>
              <td class="item-name">Address &amp; Website</td>
              <td>Physical hospital address + official website or Google Maps location link.</td>
              <td><em>Aarti Chowk, Nagpur Road, Wardha</em><br><code>https://cortexhospital.com</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 4 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">4</div>
          <div class="section-title">Meta Business Verification Documents (KYC)</div>
          <div class="section-badge badge-action">High Priority</div>
        </div>
        <p class="item-desc" style="margin-bottom: 5px;">Meta allows unverified businesses to message only up to 250 unique patients/day. For unlimited scale (1,000 to 100,000+ patients/day), Meta requires business verification.</p>
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Document Required</th>
              <th style="width: 44%;">Specific Acceptance Criteria</th>
              <th style="width: 28%;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="item-name">Legal Business Proof (Any 1)</td>
              <td>
                • Clinical Establishment Act Registration Certificate<br>
                • GST Registration Certificate (Form REG-06)<br>
                • Shop &amp; Establishment Act License / Municipal Trade License<br>
                • Certificate of Incorporation (if Pvt Ltd / Trust / LLP)<br>
                <em>*Must state the Legal Name and Registered Address.</em>
              </td>
              <td>Provide PDF / Scanned Copy</td>
            </tr>
            <tr>
              <td class="item-name">Address Proof (Any 1)</td>
              <td>
                • Recent Hospital Electricity / Utility Bill (last 3 months)<br>
                • Hospital Bank Account Statement with official stamp &amp; address<br>
                • Landline telephone / broadband bill showing hospital address
              </td>
              <td>Provide PDF / Scanned Copy</td>
            </tr>
            <tr>
              <td class="item-name">Authorized Contact Person</td>
              <td>Full name, official hospital email (e.g. <code>info@hospital.com</code> or Gmail), and mobile number of medical director / administrator.</td>
              <td>Name + Mobile + Email</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 5 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">5</div>
          <div class="section-title">Meta Billing &amp; International Payment Setup</div>
          <div class="section-badge badge-mandatory">Mandatory</div>
        </div>
        <div class="action-box">
          <strong>Meta Free Tier Benefit:</strong> Meta provides <strong>1,000 free Service/Support conversations every month</strong>. Inbound patient queries (booking, timing checks, prescriptions) within 24h are completely FREE within this allowance!
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Requirement</th>
              <th style="width: 44%;">Description</th>
              <th style="width: 28%;">How It Is Added</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="item-name">Payment Card</td>
              <td>A Credit or Debit Card with <strong>International Online Transactions enabled</strong> (Visa, Mastercard, or American Express).</td>
              <td>Client enters card details directly into Meta Business Suite ➔ Payment Methods.</td>
            </tr>
            <tr>
              <td class="item-name">GSTIN for Invoicing</td>
              <td>Hospital GST number to claim input tax credit on Meta API conversation invoices.</td>
              <td>Enter GSTIN in Meta Ad Account / WABA billing section.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer-bar">
      <div><strong>Svaasth Connect</strong> – Hospital Management &amp; Patient AI System</div>
      <div>Page 2 of 3</div>
    </div>
  </div>

  <!-- ==================== PAGE 3: CLINIC DATA & SUBMISSION FORM ==================== -->
  <div class="page page-last">
    <div>
      <div class="header">
        <img src="data:image/png;base64,{svaasth_logo_b64}" class="header-logo" alt="Svaasth Logo">
        <div class="doc-meta">
          <div class="doc-tag">Clinical &amp; Form</div>
          <div class="doc-date">Clinical Data &amp; Form</div>
        </div>
      </div>

      <!-- SECTION 6 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">6</div>
          <div class="section-title">Hospital Operational &amp; Clinical Schedule</div>
          <div class="section-badge badge-mandatory">Mandatory</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Data Field</th>
              <th style="width: 44%;">Details Needed</th>
              <th style="width: 28%;">Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="item-name">Doctors &amp; Specialties</td>
              <td>Full name of consulting doctors, medical degrees, and departments.</td>
              <td>Dr. Vipeen Raut (MS Ortho, Joint Replacement)</td>
            </tr>
            <tr>
              <td class="item-name">OPD Timings &amp; Sessions</td>
              <td>Morning and Evening hours for OPD, slot duration (e.g. 15 min), and weekly off days (e.g. Sunday closed).</td>
              <td>Morning: 10:30 AM – 1:00 PM<br>Evening: 6:00 PM – 7:30 PM</td>
            </tr>
            <tr>
              <td class="item-name">Reception &amp; Emergency Lines</td>
              <td>Primary reception landline/mobile for front desk handover and 24/7 casualty line.</td>
              <td>Reception: <code>07152-255795</code><br>Casualty: <code>+91 9373280505</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 7 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">7</div>
          <div class="section-title">Client Information Submission Form</div>
          <div class="section-badge badge-action">Fill &amp; Return</div>
        </div>
        <table class="check-table">
          <thead>
            <tr>
              <th class="box-cell">✓</th>
              <th style="width: 32%;">Item</th>
              <th style="width: 62%;">Hospital / Client Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">Hospital / Clinic Legal Name</td>
              <td class="fill-line"></td>
            </tr>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">WhatsApp Phone Number to Link</td>
              <td class="fill-line"></td>
            </tr>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">Desired WhatsApp Display Name</td>
              <td class="fill-line"></td>
            </tr>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">Facebook / Meta Admin Email</td>
              <td class="fill-line"></td>
            </tr>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">Primary Contact Person &amp; Mobile</td>
              <td class="fill-line"></td>
            </tr>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">Reception Helpline Number</td>
              <td class="fill-line"></td>
            </tr>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">Emergency / Casualty Contact</td>
              <td class="fill-line"></td>
            </tr>
            <tr>
              <td class="box-cell"><span class="checkbox"></span></td>
              <td class="item-name">Hospital GSTIN (for Meta invoices)</td>
              <td class="fill-line"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 8 -->
      <div class="section">
        <div class="section-header">
          <div class="section-num">8</div>
          <div class="section-title">Frequently Asked Questions &amp; Pro Tips</div>
          <div class="section-badge badge-info">Reference</div>
        </div>
        <table>
          <tbody>
            <tr>
              <td class="item-name" style="width: 35%;">Can we use our existing personal number?</td>
              <td>Yes, but its personal WhatsApp account must be deleted inside the WhatsApp app. Once connected to Cloud API, it can no longer be used as a personal WhatsApp on a phone. We strongly recommend getting a dedicated hospital SIM or virtual number.</td>
            </tr>
            <tr>
              <td class="item-name">Can landline numbers be used?</td>
              <td>Yes! Landlines are supported. Meta verifies landlines via automated voice call OTP. If your landline has an IVR/EPABX tree, temporarily forward incoming calls to a direct mobile during the 10-minute linking window.</td>
            </tr>
            <tr>
              <td class="item-name">How do we get the Official Green Tick Badge?</td>
              <td>Meta awards the Official Business Account (Green Tick) to verified, notable healthcare brands. We submit the Green Tick application for your hospital post-verification at no extra fee.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer-bar">
      <div>Technical Onboarding: <span class="contact-badge">+91 9373280505</span> | support@svaasth.com</div>
      <div>Page 3 of 3</div>
    </div>
  </div>

</body>
</html>
"""

with open('onboarding_requirements_print.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
output_pdf_root = "/Users/nityomtikhe/Whatsapp/WhatsApp_Client_Onboarding_Requirements.pdf"
output_pdf_public = "/Users/nityomtikhe/Whatsapp/public/WhatsApp_Client_Onboarding_Requirements.pdf"
output_pdf_brain = "/Users/nityomtikhe/.gemini/antigravity/brain/a462f2b7-8f08-4607-a989-42eb1cb213da/WhatsApp_Client_Onboarding_Requirements.pdf"

cmd = [
    chrome_path,
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={output_pdf_root}",
    "--no-pdf-header-footer",
    f"file://{os.path.abspath('onboarding_requirements_print.html')}"
]

res = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(output_pdf_root):
    with open(output_pdf_root, 'rb') as src:
        pdf_bytes = src.read()
    with open(output_pdf_public, 'wb') as dst:
        dst.write(pdf_bytes)
    with open(output_pdf_brain, 'wb') as dst:
        dst.write(pdf_bytes)
    print(f"SUCCESS: Generated {len(pdf_bytes)} bytes PDF")
