document.addEventListener('DOMContentLoaded', function() {
    const table = document.getElementById('security-log');
    const rows = table.getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) {
        rows[i].addEventListener('click', function() {
            this.classList.toggle('selected');
        });
    }
});

async function sendMessage(data) {
    const responseElement = document.getElementById('response');
    const modelSelect = document.getElementById('model-select');
    const selectedModel = modelSelect.options[modelSelect.selectedIndex].value;

    responseElement.innerHTML = '';

    try {
        const response = await fetch(`http://gamme-server.ru:8080/send_message?model=${selectedModel}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        console.log('Отправлено:', data);
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';

        function readStream() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('Stream complete');

                    responseElement.innerHTML = marked.parse(accumulatedText);
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;

                responseElement.innerHTML = marked.parse(accumulatedText);

                readStream();
            }).catch(error => {
                console.error('Error reading stream:', error);
            });
        }

        readStream();

    } catch (error) {
        console.error('Error fetching:', error);
    }
}

function gatherSelectedData() {
    const table = document.getElementById('security-log');
    const rows = table.getElementsByTagName('tr');
    const selectedData = [];

    for (let i = 1; i < rows.length; i++) {
        if (rows[i].classList.contains('selected')) {
            const cells = rows[i].getElementsByTagName('td');
            selectedData.push({
                action: cells[0].textContent,
                datetime: cells[1].textContent,
                files: cells[2].textContent,
                severity: cells[3].textContent
            });
        }
    }

    return selectedData;
}

function sendSelectedRowsToServer() {
    const selectedData = gatherSelectedData();
    sendMessage({ content: JSON.stringify(selectedData) });
}

function toggleChat() {
    const chat = document.getElementById('chat');
    const button = document.querySelector('.support-button');

    if (chat.classList.contains('open')) {
        chat.classList.remove('open');
        button .classList.remove('open');
    } else {
        chat.classList.add('open');
        button.classList.add('open');
    }
}