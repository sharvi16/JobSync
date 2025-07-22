const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("."));

// Serve static files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your app password
  },
  tls: {
    rejectUnauthorized: false,
  },
});


// Contact form endpoint
app.post("/send-email", async (req, res) => {
  try {
    const { user_name, user_role, user_email, portfolio_link, message } =
      req.body;

    // Validate required fields
    if (!user_name || !user_role || !user_email || !message) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Setup email data
    const mailOptions = {
      from: `"${user_name}" <${process.env.EMAIL_USER}>`, 
      to: process.env.EMAIL_USER, 
      replyTo: user_email,
      subject: `New Contact Form Submission from ${user_name} - JobSync`, 
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #fc002d, #ff6b00); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; text-align: center;">New Contact Form Submission</h1>
            <p style="color: white; text-align: center; margin: 10px 0 0 0; opacity: 0.9;">JobSync Website</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Contact Details</h2>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #fc002d;">Name:</strong>
              <span style="margin-left: 10px;">${user_name}</span>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #fc002d;">Role/Position:</strong>
              <span style="margin-left: 10px;">${user_role}</span>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #fc002d;">Email:</strong>
              <a href="mailto:${user_email}" style="margin-left: 10px; color: #ff6b00; text-decoration: none;">${user_email}</a>
            </div>
            
            ${
              portfolio_link
                ? `
              <div style="margin-bottom: 15px;">
                <strong style="color: #fc002d;">Portfolio/Website:</strong>
                <a href="${portfolio_link}" target="_blank" style="margin-left: 10px; color: #ff6b00; text-decoration: none;">${portfolio_link}</a>
              </div>
            `
                : ""
            }
            
            <div style="margin-top: 25px;">
              <strong style="color: #fc002d;">Message:</strong>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #fc002d;">
                ${message.replace(/\n/g, "<br>")}
              </div>
            </div>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin-top: 25px; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin: 0 0 10px 0;">Quick Actions</h3>
              <p style="margin: 5px 0; color: #555;">
                📧 <strong>Reply:</strong> Just hit reply to respond directly to ${user_name}
              </p>
              <p style="margin: 5px 0; color: #555;">
                📞 <strong>Call:</strong> ${user_email} 
              </p>
              <p style="margin: 5px 0; color: #555;">
                🌐 <strong>Portfolio:</strong> ${
                  portfolio_link || "Not provided"
                }
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666;">
            <p style="font-size: 14px;">
              This email was sent from the JobSync contact form.<br>
              Reply directly to this email to respond to ${user_name}.
            </p>
            <p style="font-size: 12px; margin-top: 10px;">
              Submitted on: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
      text: `
        New Contact Form Submission - JobSync
        
        Contact Details:
        ================
        Name: ${user_name}
        Role: ${user_role}
        Email: ${user_email}
        ${portfolio_link ? `Portfolio: ${portfolio_link}` : ""}
        
        Message:
        ========
        ${message}
        
        ================
        Submitted on: ${new Date().toLocaleString()}
        
        Reply directly to this email to respond to ${user_name}.
      `,
    };

    // Send mail with defined transport object
    const info = await transporter.sendMail(mailOptions);

  

    res.json({
      success: true,
      message: "Email sent successfully!",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log("📧 Email service is ready!");
});

module.exports = app;
