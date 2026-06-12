export const emailStyles = `
    p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 20.0px 'Helvetica Neue'; min-height: 25.0px}
    p.p2 {margin: 0.0px 0.0px 0.0px 0.0px; font: 13.0px 'Helvetica Neue'; min-height: 15.0px}
    p.p3 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px '.AppleSystemUIFontMonospaced'}
    p.p4 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px '.AppleSystemUIFontMonospaced'; min-height: 15.0px}

    body {
      font-family: 'Arial', sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      color: #333;
    }

    .email-container {
      max-width: 700px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .email-header {
      background: #39877f;
      color: white;
      padding: 20px 30px;
      text-align: left;
      font-size: 24px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .email-header img {
      height: 40px;
      width: auto;
    }

    .email-header span {
      color: #f1bb16;
    }

    .divider {
      height: 5px;
      background: linear-gradient(to right, #f1bb16, #42c0b4);
    }

    .email-body {
      padding: 20px 30px;
    }

    .email-body h3 {
      color: #42c0b4;
      margin-bottom: 10px;
      font-size: 18px;
      border-left: 4px solid #f1bb16;
      padding-left: 10px;
    }

    .email-body p {
      margin: 10px 0;
      font-size: 16px;
      line-height: 1.6;
    }

    .email-body ul {
      list-style: none;
      padding: 0;
      margin: 15px 0;
    }

    .email-body ul li {
      background: #e6f7f5;
      margin: 8px 0;
      padding: 10px;
      border: 1px solid #42c0b4;
      border-radius: 4px;
    }

    .transcript-list {
      list-style: none;
      padding: 0;
      margin: 15px 0;
    }

    .transcript-item {
      margin: 8px 0;
      padding: 10px;
      border-radius: 6px;
      color: #333;
      font-size: 14px;
      line-height: 1.5;
    }

    .transcript-item.agent {
      background: #e6f7f5;
      border-left: 4px solid #42c0b4;
    }

    .transcript-item.visitor {
      background: #fff5cc;
      border-left: 4px solid #f1bb16;
    }

    .transcript-role {
      font-weight: bold;
      color: inherit;
    }

    .email-body .highlight {
      background: #f1bb16;
      color: #333;
      padding: 5px 10px;
      border-radius: 5px;
      font-weight: bold;
      display: inline-block;
      margin-bottom: 15px;
    }

    .email-footer {
      background: #f1bb16;
      color: white;
      padding: 15px 30px;
      text-align: left;
      font-size: 14px;
      border-top: 5px solid #42c0b4;
    }

    .email-footer a {
      color: #42c0b4;
      text-decoration: none;
      font-weight: bold;
    }
`
