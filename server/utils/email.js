// Basic email utility - replace with real logic as needed
const sendEmail = async (options) => {
  console.log('Email would be sent to:', options.email);
  console.log('Subject:', options.subject);
  console.log('Message:', options.message);
  // For now, just resolve
  return Promise.resolve();
};

module.exports = { sendEmail };