import nodemailer from 'nodemailer';
import { OTP } from '../models';
import { Channel, Message } from 'amqplib';

const sendOtp = async (channel: Channel, msg: Message) => {
    try {
        if (!process.env.NODEMAILER_HOST || !process.env.NODEMAILER_PORT) {
            throw new Error('NODEMAILER_HOST or NODEMAILER_PORT is not defined');
        }

        // Get email and userType from the message
        const { email, userType } = JSON.parse(msg.content.toString());

        // Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Check if entry exists in the database, update or create new
        let otpDoc = await OTP.findOne({ email });
        if (otpDoc) {
            otpDoc.otp = otp;
        } else {
            otpDoc = await OTP.create({
                email,
                userType,
                otp
            });
        }

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
            subject: "Your OTP for Verification",
            text: `Hello, your OTP for ${userType} verification is: ${otp}`
        };

        // Send the OTP email
        try {
            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${email}`);
        } catch (error: any) {
            console.error("Error sending OTP email:", error.message);
        }
    } catch (error: any) {
        console.error(`Error in sendOtp function: ${error.message}`);
    }
};

export default sendOtp;
