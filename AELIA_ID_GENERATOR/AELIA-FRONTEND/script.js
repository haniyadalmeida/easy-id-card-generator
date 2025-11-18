// ================= BACKEND URL ==================
const BACKEND_URL = "http://localhost:4000";

// Format DD/MM/YYYY for preview
function formatDate(value) {
  if (!value) return "--/--/----";
  const d = new Date(value);
  if (isNaN(d)) return "--/--/----";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// =================================================
// ============== UPDATE FRONTEND PREVIEW ==========
// =================================================

function updatePreview() {
  const name = document.getElementById("name").value || "Your Name";
  const position = document.getElementById("position").value || "Job Position";
  const idnum = document.getElementById("idnum").value || "---";
  const dob = formatDate(document.getElementById("dob").value);
  const phone = document.getElementById("phone").value || "---";
  const email = document.getElementById("email").value || "---";
  const issue = formatDate(document.getElementById("issuedate").value);
  const expiry = formatDate(document.getElementById("expirydate").value);

  // Insert text into preview
  document.getElementById("preview_name").innerText = name;
  document.getElementById("preview_position").innerText = position;
  document.getElementById("preview_id").innerText = idnum;
  document.getElementById("preview_dob").innerText = dob;
  document.getElementById("preview_phone").innerText = phone;
  document.getElementById("preview_email").innerText = email;
  document.getElementById("preview_issue").innerText = issue;
  document.getElementById("preview_expiry").innerText = expiry;

  // PHOTO preview
  const photo = document.getElementById("photo").files[0];
  if (photo) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById("photoPreview").src = e.target.result;
    };
    reader.readAsDataURL(photo);
  }

  // SIGNATURE preview
  const signature = document.getElementById("signature").files[0];
  if (signature) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById("signaturePreview").src = e.target.result;
    };
    reader.readAsDataURL(signature);
  }

  // FRONTEND BARCODE (for preview only)
  try {
    JsBarcode("#barcode", idnum, {
      format: "CODE128",
      displayValue: true,
      lineColor: "#000",
      width: 2,
      height: 50,
      fontSize: 14,
      margin: 6
    });
  } catch (e) {
    console.log("Barcode error", e);
  }

  // =================================================
  // ====== SEND DATA TO BACKEND AUTOMATICALLY =======
  // =================================================
  sendDataToBackend();
}

// =================================================
// ======== SEND DATA TO BACKEND FUNCTION ==========
// =================================================

async function sendDataToBackend() {
  const fd = new FormData();

  // append text fields
  fd.append('name', document.getElementById('name').value);
  fd.append('position', document.getElementById('position').value);
  fd.append('idnum', document.getElementById('idnum').value);
  fd.append('dob', document.getElementById('dob').value);
  fd.append('phone', document.getElementById('phone').value);
  fd.append('email', document.getElementById('email').value);
  fd.append('issuedate', document.getElementById('issuedate').value);
  fd.append('expirydate', document.getElementById('expirydate').value);

  // append files
  const photo = document.getElementById('photo').files[0];
  if (photo) fd.append('photo', photo);

  const signature = document.getElementById('signature').files[0];
  if (signature) fd.append('signature', signature);

  // If your frontend already has static logo/scanner, no need to send them.
  // Uncomment if needed:
  // const logo = document.getElementById('logoInput').files[0];
  // if (logo) fd.append('logo', logo);

  try {
    const res = await fetch(`${BACKEND_URL}/api/cards`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    console.log("Back-end Response:", data);

    if (data.ok) {
      console.log("✔ Card successfully saved in backend!");
      console.log("✔ Saved files:", data.urls);
    } else {
      console.error("Backend Error:", data.error);
    }

  } catch (err) {
    console.error("Request failed:", err);
  }
}

// =================================================
// ============== DOWNLOAD FRONT/BACK ==============
// =================================================

function downloadSide(side) {
  const element = side === "front"
    ? document.getElementById("card-front")
    : document.getElementById("card-back");

  html2canvas(element, { scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = `Aelia_${side}_card.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

// Auto preview on first load
window.onload = () => updatePreview();
// ================= TEMPLATE SWITCHING =================

const cardFront = document.getElementById("card-front");
const cardBack = document.getElementById("card-back");
const templateSelect = document.getElementById("templateSelect");

templateSelect.addEventListener("change", () => {
  const t = templateSelect.value;

  // Reset templates
  cardFront.classList.remove("template1", "template2");
  cardBack.classList.remove("template1", "template2");

  // Apply new template
  cardFront.classList.add(t);
  cardBack.classList.add(t);
});

// Default template on load
window.addEventListener("load", () => {
  cardFront.classList.add("template1");
  cardBack.classList.add("template1");
});

