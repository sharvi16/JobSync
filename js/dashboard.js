document.addEventListener("DOMContentLoaded", function () {
    const resumeInput = document.getElementById("resumeInput");
    const uploadStatus = document.getElementById("upload-status");
    const uploadLabel = document.querySelector(".upload-label");
    const jobList = document.getElementById("job-list");

    // Clicking the label triggers file input
    uploadLabel.addEventListener("click", function () {
        resumeInput.click();
    });

    // Handling file upload
    resumeInput.addEventListener("change", function (event) {
        const file = event.target.files[0];

        if (file) {
            uploadStatus.textContent = "Processing Resume...";
            uploadStatus.style.color = "white";

            // Simulating resume processing delay
            setTimeout(() => {
                uploadStatus.textContent = `Resume Uploaded! Fetching job recommendations...`;
                uploadStatus.style.color = "#00FF00"; // Green color for success
                
                fetchJobRecommendations(); // Simulating AI job recommendations
            }, 2000);
        } else {
            uploadStatus.textContent = "Upload your resume to get job recommendations";
            uploadStatus.style.color = "gray";
        }
    });

    // Function to simulate job recommendations
    function fetchJobRecommendations() {
        jobList.innerHTML = `
            <li>🚀 Software Engineer - Google</li>
            <li>🌟 AI Developer - OpenAI</li>
            <li>🔍 Data Scientist - Microsoft</li>
        `;
    }
});

// Chatbot function
function openChatbot() {
    window.open("https://chatbot.jobsync.com", "_blank");
}
