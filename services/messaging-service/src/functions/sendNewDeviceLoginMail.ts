import nodemailer from 'nodemailer';
import {Message } from 'amqplib';

const sendNewDeviceLoginMail = async (msg: Message) => {
    try {
        if (!process.env.NODEMAILER_HOST || !process.env.NODEMAILER_PORT) {
            throw new Error('NODEMAILER_HOST or NODEMAILER_PORT is not defined');
        }

        const { email, name, deviceInfo } = JSON.parse(msg.content.toString());
        console.log(name)
        // Set up Nodemailer transport
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: parseInt(process.env.NODEMAILER_PORT || '587'),
            secure: process.env.NODEMAILER_SECURE === 'true',
            auth: {
                user: process.env.SOURCE_EMAIL_ID,
                pass: process.env.SOURCE_EMAIL_PASS
            }
        });

        // Mail options
        const mailOptions = {
            from: process.env.SOURCE_EMAIL_ID,
            to: email,
            subject: "New Device Login",
            text: `Hello ${name}, a new Device logged in to your account. Device info: ${deviceInfo}`
        };

        // Send the OTP email
        try {
            await transporter.sendMail(mailOptions);
            console.log(`Mail sent to ${email}`);
        } catch (error: any) {
            console.error("Error sending new device login email:", error.message);
        }
    } catch (error: any) {
        console.error(`Error in sendNewDeviceLoginMail function: ${error.message}`);
    }
};

export default sendNewDeviceLoginMail;
