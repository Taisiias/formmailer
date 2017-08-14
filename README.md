# FormMailer

HTTP Server that emails data from submitted forms on your website.

The page below:

```
<html>
<body>
    <form action="http://localhost:8080/" method="post">
        <div>
            <label for="msg">Message:</label>
            <textarea id="msg" name="user_message"></textarea>
        </div>
        <div class="button">
            <button type="submit">Send your message</button>
        </div>
    </form>
</body>
</html>
```
sends the following e-mail

```
> Content-Type: text/plain
> From: root@formsender-test.localdomain
> To: test@test.com
> Subject: Test formmailer
> Message-ID:
>  <dfc9cdf6-ec60-1a6a-089c-bed4566b05ef@formsender-test.localdomain>
> Content-Transfer-Encoding: 7bit
> Date: Mon, 14 Aug 2017 13:29:25 +0000
> MIME-Version: 1.0
> 
> user_message: TEST
>
```

## Deploying & Using

1. Install Node.js
2. Clone Formmailer repository
``` 
git clone https://github.com/Taisiias/formmailer.git
```
3. Install formmailer dependincies
```
npm install
```
4. Fill in config.json (see Configuration Options section). 
5. To run Formmailer type in 
```
npm start
```

Now your server is ready to listen to POST requests and send out e-mails.

### Configuration Options

* `fromEmail` - sender that will be shown in your e-mail (default value: `"formmailer@localhost"`)
* `httpListenIP` - (default value: `"0.0.0.0"`)
* `httpListenPort` - (default value: `8080`)
* `httpServerPath` - (default value: `"/"`)
* `logLevel` - defines on how detailed `winston` log will be (default value: `"debug"`)
* `maxHttpRequestSize` - (default value: `1e6`)
* `redirectFieldName` - (default value: `"_defaultRedirect"`)
* `smtpHost` - (default value: `"localhost"`)
* `smtpPort` - (default value: `25`)
* `subject` - subject of the received e-mail (default value: `"Message from {{referrerUrl}}"`, where `{{referrerUrl}}` is the address of the webpage from which the form was submitted)
* `recipientEmails` - recipients' email addresses, required option (no default value)

### Example Form

### Special HTML Inputs

## How To Contribute

```
$ npm install
$ npm run start-smtp
$ npm run watch
$ open test/index.html
```