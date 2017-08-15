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
* `httpListenIP` - HTTP listen IP (default value: `"0.0.0.0"`)
* `httpListenPort` - HTTP listen port (default value: `8080`)
* `httpServerPath` - HTTP server path (default value: `"/"`)
* `logLevel` - defines on how detailed `winston` log will be (default value: `"debug"`)
* `maxHttpRequestSize` - Maximum size of HTTP request (default value: `1e6`)
* `redirectFieldName` - address of the webpage to be redirected to after the form is submitted. (default value: `"_defaultRedirect"`)
* `smtpHost` - SMTP host (default value: `"localhost"`)
* `smtpPort` - SMTP port (default value: `25`)
* `subject` - subject of the e-mail received (default value: `"Message from {{referrerUrl}}"`, where `{{referrerUrl}}` is the address of the webpage with the form to be submitted)
* `recipientEmails` - recipients' email addresses, string or string array in case of multiple recipients required option (no default value)

### Example Form
The form below

![Form Screenshot](/img/form_screen.png)

will send the following e-mail

![Form Screenshot](/img/email.png)

### Special HTML Inputs

Special HTML inputs can be included into your webpage code.

```
<input type="hidden" id="_redirect" name="_redirect"   value="https://google.com">
```
`_redirect` field is used to define the address of the webpage you want to be redirected after the form is submitted. If `_redirect` is not specified you will be redirected to default `thanks.html` page.

## How To Contribute

If you want to run Formmailer in test mode you will need to do the following:

1. Complete items 1-4 of Deploying & Using section.
2. To run in test mode execute
```
$ npm run live
```
2. Run test SMTP server in separate Terminal window
```
$ npm run test-smtp-server
```
3. Open
```
$ open test/index.html
```
4. Fill in form fields and try submitting.