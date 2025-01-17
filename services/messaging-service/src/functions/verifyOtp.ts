import { OTP } from '../models';
import { Channel, Message } from 'amqplib';

interface response {
    success: boolean;
    message: string;
}

const verifyOtp = async (channel: Channel, msg: Message) => {
    try {
        // get email and otp from the message
        const { email, otp } = JSON.parse(msg.content.toString());
        // check for otp entry
        let response;
        let otpDoc = await OTP.findOne({ email });
        if (!otpDoc) {
            response = {success: false, message: "OTP doesn't exist"}
        } 
        // check if otp is valid
        else if (otpDoc.otp !== otp) {
            response = {success: false, message: "Invalid OTP"}
        }
        // if otp is valid, delete the otp document
        else {
            await otpDoc.deleteOne();
            response = {success: true, message: "Otp verified successfully"}
        }
        // send a success message
        
        channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(response)),
            { correlationId: msg.properties.correlationId }
        );

        channel.ack(msg);
    } catch (error: any) {
        console.error(`Error in sendOtp function: ${error.message}`);
    }
};

export default verifyOtp;
