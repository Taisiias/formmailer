# FormMailer

![CircleCI badge](https://img.shields.io/circleci/project/github/Taisiias/formmailer.svg)

FormMailer runs as a service and emails contents of forms posted on the specified websites. It is the most useful as a simple backend that helps to receive user-submitted information from the static website contact/support forms.

![Workflow](/img/formmailer-workflow.png)

Suppose you have this static page:

```html
<html>
<body>
    <form action="http://myformmailer.mydomain.com/" method="post">
        <div>
            <label for="msg">Message:</label>
            <textarea id="msg" name="User Message"></textarea>
        </div>
        <div class="button">
            <button type="submit">Send your message</button>
        </div>
    </form>
</body>
</html>
```

FormMailer service deployed on your domain `http://myformmailer.mydomain.com/` will receive user-submitted POST requests and send emails similar to this one:

```
> Content-Type: text/plain
> From: formmailer@mydomain.com
> To: support@mydomain.com
> Subject: Form submitted on http://mydomain.com/index.html
> Message-ID:
>  <dfc9cdf6-ec60-1a6a-089c-bed4566b05ef@mydomain.com>
> Content-Transfer-Encoding: 7bit
> Date: Mon, 14 Aug 2017 13:29:25 +0000
> MIME-Version: 1.0
>
> Submitted user form was received by FormMailer server, see details below.
>
> Referrer page: http://mydomain.com/index.html
>
> User Message:
>   Hello world!
>
> Submitter IP address: 1.2.3.4
```

Additional features:

* [Mustache.JS](https://github.com/janl/mustache.js) templates for email body and subject.
* All received data and sent emails are saved to the local SQLite database.
* Special hidden form input field can be provided to specify URL where the user should be redirected after the form is submitted.

## Deploying

1. Install Node.js.

2. Clone FormMailer repository.
    ```bash
    $ git clone https://github.com/Taisiias/formmailer.git
    $ cd formmailer
    ```

3. Install FormMailer NPM dependincies:
    ```bash
    $ npm install
    ```

4. Copy `config.example.json` to `config.json` and fill in your configuration (see Configuration Options below).

5. Start FormMailer:
    ```bash
    $ npm start
    ```
    You can specify `config.json` filename location with `-c` command line argument like that: `npm start -- -c my-config.json`.

6. (optionally) Deploy FormMailer service with Systemd or other means, so it will start-up with the system and always run in background.

    **Example for Ubuntu 17.04**

    Create a new file `/lib/systemd/system/formmailer.service` and place following contents inside:

    ```ini
    [Unit]
    Description=FormMailer Service
    After=network.target

    [Service]
    Type=simple
    User=formmailer
    Group=formmailer
    ExecStart=/usr/bin/node ./build/src/index.js -c ./config.json
    Restart=on-failure
    Environment=NODE_ENV=production
    WorkingDirectory=/var/formmailer

    [Install]
    WantedBy=multi-user.target
    ```

    Change `WorkingDirectory` to the directory where you have cloned FormMailer.

    Supposing you have cloned FormMailer repository to `/var/formmailer`, run:

    ```bash
    $ # create user and group
    $ sudo groupadd formmailer && sudo useradd formmailer -g formmailer

    $ # go to the formmailer repo directory
    $ cd /var/formmailer

    $ # build JS files from TypeScript sources (you have to do this every time you update source code repo)
    $ npm run build

    $ # change the owner of the formmailer directory to the formmailer user
    $ sudo chown formmailer:formmailer . -R

    $ # force systemd to load the new service file
    $ sudo systemctl daemon-reload

    $ # start the service
    $ sudo systemctl start formmailer
    ```

    Don't forget to check your firewall settings to allow outside TCP connections to the port specified in `httpListenPort` setting.

*NOTE: FormMailer uses default NodeJS HTTP server. For production environment it is recommended to set up a reverse proxy (Nginx or alternative) that will hide FormMailer service from the outside world.*

### Configuration Options

Default configuration file location is `./config.json`. You can provide different location with `-c` command line argument.

* `recipientEmails` - E-mail recipient address. String or array of strings (for multiple recepients). Required field.
* `fromEmail` - E-mail address that will be provided in `From:` email header (default value: `"formmailer@localhost"`).
* `httpListenIP` - IP address to listen HTTP requests from (default value: `"0.0.0.0"` - all IP addresses).
* `httpListenPort` - Port to listen HTTP requests from (default value: `3000`).
* `httpServerPath` - URL path that will receive form data (part that goes after domain name. Default value: `"/"`).
* `smtpHost` - SMTP server host name or IP (default value: `"localhost"`).
* `smtpPort` - SMTP server port (default value: `25`).
* `logLevel` - How detailed logging should be (default value: `"info"`).
* `maxHttpRequestSize` - Maximum allowed size of HTTP requests, in bytes (default value: `1000000`).
* `redirectFieldName` - Name of the HTML input that contains redirect URL address (default value: `"_redirect"`).
* `subject` - Email subject field content (default value: `"Message from {{referrerUrl}}"`, where `{{referrerUrl}}` will be changed to the address of the webpage from where the form is submitted).

### Redirect URL special field

HTML form can include special HTML input with name `_redirect`.

```html
<input type="hidden" name="_redirect" value="https://google.com">
```

FormMailer will redirect user to specified URL after the form is successfuly submitted. If `_redirect` field is ommited, user will be redirected to the default `thanks.html` page hosted by FormMailer.

## How To Contribute

Run FormMailer in development mode:

1. Install NodeJS and yarn (with `npm install -g yarn`), clone this repo and install dependencies with `yarn install` command.

2. Copy `config.example.json` to `config.json`. Change configuration options if you wish so. Defaults should work for local development.

3. Start FormMailer in the development mode:
    ```bash
    $ yarn live
    ```
    This will start three processes and share terminal stdout/stderr between them:
    * [SMTP] Mock SMTP server that outputs all received emails to stdout.
    * [HTTP] HTTP server that serves files from `./test` folder (and opens `./test/index.html` in browser)
    * [FM] FormMailer in hot-reloading mode (process will restart after you edit any TS sources).

4. Page 'http://127.0.0.1:8080/index.html' will be automatically opened in your browser. Try to submit the form. If your setup is working correctly, you should see the contents of the email with posted data in terminal output.

5. Hack away and submit a PR when ready!

## Alternatives

* [Formspree](https://github.com/formspree/formspree)
* [FormMailerService](https://github.com/abbr/FormMailerService)

## License

[MIT License](LICENSE)
