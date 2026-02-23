// ============================================================
// VTop+ Captcha Solver — Unified handler for vtop + vtopcc
// ============================================================

// ── Bitmap-based solver (vtop.vit.ac.in text captchas) ──

const captcha_parse = (imgarr) => {
  let captcha = "";
  for (let x = 1; x < 44; x++) {
    for (let y = 1; y < 179; y++) {
      const condition1 =
        imgarr[x][y - 1] === 255 &&
        imgarr[x][y] === 0 &&
        imgarr[x][y + 1] === 255;
      const condition2 =
        imgarr[x - 1][y] === 255 &&
        imgarr[x][y] === 0 &&
        imgarr[x + 1][y] === 255;
      const condition3 = imgarr[x][y] !== 255 && imgarr[x][y] !== 0;
      if (condition1 || condition2 || condition3) {
        imgarr[x][y] = 255;
      }
    }
  }
  for (let j = 30; j < 181; j += 30) {
    let matches = [];
    const chars = "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
    for (let i = 0; i < chars.length; i++) {
      let match = 0;
      let black = 0;
      const ch = chars.charAt(i);
      const mask = bitmaps[ch];
      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 30; y++) {
          let y1 = y + j - 30;
          let x1 = x + 12;
          if (imgarr[x1][y1] == mask[x][y] && mask[x][y] == 0) {
            match += 1;
          }
          if (mask[x][y] == 0) {
            black += 1;
          }
        }
      }
      const perc = match / black;
      matches.push([perc, ch]);
    }
    captcha += matches.reduce(
      function (a, b) {
        return a[0] > b[0] ? a : b;
      },
      [0, 0]
    )[1];
  }
  return captcha;
};

const uri_to_img_data = (URI) => {
  return new Promise(function (resolve, reject) {
    if (URI == null) return reject();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    let image = new Image();
    image.addEventListener(
      "load",
      function () {
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(context.getImageData(0, 0, canvas.width, canvas.height));
      },
      false
    );
    image.src = URI;
  });
};

const fill_captcha = (imgb64) => {
  uri_to_img_data(imgb64).then((imageData) => {
    let arr = [];
    let newArr = [];
    for (let i = 0; i < imageData["data"].length; i += 4) {
      let gval =
        imageData["data"][i] * 0.299 +
        imageData["data"][i + 1] * 0.587 +
        imageData["data"][i + 2] * 0.114;
      arr.push(gval);
    }
    while (arr.length) newArr.push(arr.splice(0, 180));
    const res = captcha_parse(newArr);
    const captchaInput = document.getElementById("captchaCheck");
    if (captchaInput) captchaInput.value = res;
  });
};

const solve_captcha = (img) => {
  if (img && img.src) fill_captcha(img.src);
};

// ── Neural-network-based solver (vtopcc picture captchas) ──

const pre_img = (img) => {
  let avg = 0;
  img.forEach((e) => e.forEach((f) => (avg += f)));
  avg /= img.length * img[0].length;
  const bits = [];
  for (let i = 0; i < img.length; i++) {
    bits[i] = [];
    for (let j = 0; j < img[0].length; j++) {
      bits[i][j] = img[i][j] > avg ? 1 : 0;
    }
  }
  return bits;
};

const saturation = (d) => {
  const saturate = new Array(d.length / 4);
  for (let i = 0; i < d.length; i += 4) {
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    saturate[i / 4] = Math.round(((max - min) * 255) / max);
  }
  const img = [];
  for (let i = 0; i < 40; i++) {
    img[i] = [];
    for (let j = 0; j < 200; j++) {
      img[i][j] = saturate[i * 200 + j];
    }
  }
  const bls = [];
  for (let i = 0; i < 6; i++) {
    const x1 = (i + 1) * 25 + 2;
    const y1 = 7 + 5 * (i % 2) + 1;
    const x2 = (i + 2) * 25 + 1;
    const y2 = 35 - 5 * ((i + 1) % 2);
    bls[i] = img.slice(y1, y2).map((row) => row.slice(x1, x2));
  }
  return bls;
};

const flatten = (arr) => {
  const bits = new Array(arr.length * arr[0].length);
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr[0].length; j++) {
      bits[i * arr[0].length + j] = arr[i][j];
    }
  }
  return bits;
};

const mat_mul = (a, b) => {
  const x = a.length, z = a[0].length, y = b[0].length;
  const product = [];
  for (let p = 0; p < x; p++) {
    product[p] = new Array(y).fill(0);
  }
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        product[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return product;
};

const mat_add = (a, b) => {
  const c = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    c[i] = a[i] + b[i];
  }
  return c;
};

const max_soft = (a) => {
  let s = 0;
  const n = a.map(v => {
    const e = Math.exp(v);
    s += e;
    return e;
  });
  return n.map(v => v / s);
};

const solve = (img, textB) => {
  const weights = bitmaps.weights;
  const biases = bitmaps.biases;
  const label_txt = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 200;
  canvas.height = 40;
  ctx.drawImage(img, 0, 0);
  const pd = ctx.getImageData(0, 0, 200, 40);
  let bls = saturation(pd.data);
  let out = "";
  for (let i = 0; i < 6; i++) {
    bls[i] = pre_img(bls[i]);
    bls[i] = [flatten(bls[i])];
    bls[i] = mat_mul(bls[i], weights);
    bls[i] = mat_add(...bls[i], biases);
    bls[i] = max_soft(bls[i]);
    bls[i] = bls[i].indexOf(Math.max(...bls[i]));
    out += label_txt[bls[i]];
  }
  textB.value = out;
};

// ── Unified entry point ──

function myMain() {
  // --- VTOPCC Login Captcha (vtopCaptcha) ---
  if (document.URL.includes("vtopcc.vit.ac.in/vtop/initialProcess")) {
    const jsInitChecktimer = setInterval(function checkForJS_Finish() {
      const element = document.querySelector('img[alt="vtopCaptcha"]');
      if (element) {
        clearInterval(jsInitChecktimer);
        solve_captcha(element);
        const refreshBtn = document.getElementById("captchaRefresh");
        if (refreshBtn) {
          new MutationObserver(() => {
            const img = document.querySelector('img[alt="vtopCaptcha"]');
            if (img) solve_captcha(img);
          }).observe(refreshBtn, { childList: true });
        }
      }
    }, 111);
    return;
  }

  // --- VTOP Main Portal Captcha (picture/image-based text captcha) ---
  const img = document.querySelector(".form-control.img-fluid.bg-light.border-0");
  if (!img) return;

  const textB = document.getElementById("captchaStr");
  const submitB = document.getElementById("submitBtn");

  if (textB) {
    // Try the NN solver first (handles picture captchas better)
    try {
      solve(img, textB);
    } catch (e) {
      // Fallback to bitmap solver
      try {
        fill_captcha(img.src);
        // Redirect output to the correct field
        setTimeout(() => {
          const bitmapResult = document.getElementById("captchaCheck");
          if (bitmapResult && bitmapResult.value && textB) {
            textB.value = bitmapResult.value;
          }
        }, 500);
      } catch (_) { }
    }
  }

  if (submitB) submitB.focus();
}

window.addEventListener("load", myMain, false);