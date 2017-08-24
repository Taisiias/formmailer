# FormMailer

![Form Screenshot](/img/formmailer-workflow.svg)

Receives HTTP POST requests with form contents from the static sites and sends them to the email(s) specified.

Suppose you have this static page:

```
<html>
<body>
    <form action="http://myformmailer.mydomain.com/" method="post">
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

Formmailer service on your domain `http://myformmailer.mydomain.com/` will receive user-submitted POST requests and send emails similar to this one:

```
> Content-Type: text/plain
> From: formmailer@mydomain.com
> To: test@test.com
> Subject: Form submitted on http://mydomain.com/index.html
> Message-ID:
>  <dfc9cdf6-ec60-1a6a-089c-bed4566b05ef@mydomain.com>
> Content-Transfer-Encoding: 7bit
> Date: Mon, 14 Aug 2017 13:29:25 +0000
> MIME-Version: 1.0
>
> Submitted user form was received by Formmailer server, see details below.
>
> Referrer page: http://mydomain.com/index.html
>
> user_message:
>   Hello world!
>
> Submitter IP address: 1.2.3.4
```

Additional features:

* Templating email body and subject
* Saving all received data and sent email contents to local SQLite database.
* Configuring successfull redirect URL with special form input.

## Deploying

1. Install Node.js.

2. Clone Formmailer repository.
    ```
    $ git clone https://github.com/Taisiias/formmailer.git
    $ cd formmailer
    ```

3. Install Formmailer NPM dependincies:
    ```
    npm install
    ```

4. Fill in config.json (see Configuration Options below).

5. Start Formmailer:
    ```
    npm start
    ```
    You can specify `config.json` filename location with `-c` command line argument like that: `npm start -- -c my-config.json`.

6. (optionally) Deploy Formmailer service with Systemd or other means, so it will start-up with the system and always run in background.

    **Example for Ubuntu 17.04**

    Supposing you cloned Formmailer repository to `/var/formmailer`.

    Create a new file `/lib/systemd/system/formmailer.service` and place following contents inside:

    ```
    [Unit]
    Description=Formmailer
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

    Change `WorkingDirectory` to the absolute path to the directory where you have cloned Formmailer.

    After that run:

    ```
    $ # create user and group
    $ groupadd formmailer & useradd formmailer -g formmailer

    $ # go to the formmailer directory
    $ cd /var/formmailer

    $ # build JS files from TypeScript sources (you have to do this after every source code update)
    $ npm build

    $ # change the owner of the formmailer directory to the formmailer user
    $ chown formmailer:formmailer . -R

    # force systemd to load the new service file
    $ systemctl daemon-reload

    # start the service
    $ systemctl start formmailer
    ```

    Don't forget to check your firewall settings to allow outside TCP connections to the port specified in `httpListenPort` setting.

    For production servers it is recommended to set up reverse proxy (Nginx or alternative) and not open Formmailer HTTP port to outside world.

### Configuration Options

* `recipientEmails` - E-mail recipient address. String or array of strings (for multiple recepients). Required field.
* `fromEmail` - E-mail address that will be provided in `From:` email header (default value: `"formmailer@localhost"`).
* `httpListenIP` - IP address to listen HTTP requests from (default value: `"0.0.0.0"` - all IP addresses).
* `httpListenPort` - Port to listen HTTP requests from (default value: `8080`).
* `httpServerPath` - URL path that will receive form data (part that goes after domain name. Default value: `"/"`)
* `logLevel` - How detailed logging should be (default value: `"info"`)
* `maxHttpRequestSize` - Maximum allowed size of HTTP requests, in bytes (default value: `1000000`)
* `redirectFieldName` - Address of the webpage to be redirected to, after the form is submitted (can be changed individually for each form with special `_redirect` field, see below. Default value: `"_defaultRedirect"`)
* `smtpHost` - SMTP server host name or IP (default value: `"localhost"`)
* `smtpPort` - SMTP server port (default value: `25`)
* `subject` - Subject of the e-mails sent (default value: `"Message from {{referrerUrl}}"`, where `{{referrerUrl}}` will be changed to the address of the webpage from where the form is submitted)

### Redirect URL special field

HTML form can include special HTML input with name `_redirect`.

```
<input type="hidden" id="_redirect" name="_redirect"   value="https://google.com">
```

Value of this field will be used by Formmailer to determine the address of the webpage to redirect user's browser, after the form is successfuly submitted. If `_redirect` is not specified user will be redirected to the default `thanks.html` page on Formmailer HTTP server.

## How To Contribute

Run Formmailer in development mode:

1. Install NodeJS and clone this repo.

2. Copy `config.example.json` to `config.json`. Optionally: change configuration options if you like.

3. Start Formmailer in hot-reloading mode:
    ```
    $ npm run live
    ```

4. Run development SMTP server in separate Terminal window.
    ```
    $ npm run test-smtp-server
    ```
    It will receive SMTP requests and just dump their contents in `stdout`.

5. Open `test/index.html` in your browser. Submit the form to test that setup is working. You should see the contents of the email with submitted data in `test-smtp-server` output.

6. Hack away and submit a PR when ready!

## License

MIT License
