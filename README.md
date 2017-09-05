# FormMailer

![CircleCI badge](https://img.shields.io/circleci/project/github/Taisiias/formmailer.svg)

FormMailer runs as a service and emails contents of forms posted on the specified websites. It is the most useful as a simple backend that helps to receive user-submitted information from the static website contact/support forms.

![Workflow](/img/formmailer-workflow.png)

Suppose you have this static page:

```html
<html>
<body>
    <form action="http://myformmailer.mydomain.com/submit" method="post">
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
* reCAPTCHA support.

## Running

1. Install [Node.js](https://nodejs.org/en/) (version 6.11 or higher).

2. Install FormMailer with command:

    ```bash
    npm install -g formmailer
    ```

3. Create new `config.json` file and place following defaults inside:

    ```json
    {
        "recipientEmails" : "root@localhost",
        "fromEmail": "formmailer@localhost",
        "smtpHost": "localhost",
        "smtpPort": 25,
        "httpListenIP": "0.0.0.0",
        "httpListenPort": 3000
    }
    ```

     Edit settings specific for your environment (see [Configuration options](#configuration-options)). At least specify `recipientEmails` and `fromEmail`.

4. Start FormMailer:

    ```bash
    formmailer
    ```

    You can specify `config.json` file location with `-c` command line argument: `formmailer -c /path/to/my/config.json`.

Now, change the action field in your HTML form(s) to something like this:
```html
<form method="post" action="http://[domain or ip]:[port]/submit"> ...
```

Here `[domain or ip]` should be your FormMailer server domain or IP address, and `[port]` should be the port which your FormMailer instance listens to (`httpListenPort` config setting).

## Configuration options

Default configuration file location is `./config.json`. You can provide different location with `-c` command line argument.

Option  | Description | Default
--------|-------------|--------
`recipientEmails` | E-mail recipient address. String or array of strings (for multiple recepients). | Required field.
`fromEmail` | E-mail address that will be provided in `From:` email header. | `"formmailer@localhost"`
`httpListenIP` | IP address to listen HTTP requests from. | `"0.0.0.0"` (all IP addresses)
`httpListenPort` | Port to listen HTTP requests from. | `3000`
`smtpHost` | SMTP server host name or IP. | `"localhost"`
`smtpPort` | SMTP server port. | `25`
`logLevel` | How detailed logging should be (`error`, `warn`, `info`, `verbose`, `debug`, `silly`). | `"info"`
`maxHttpRequestSize` | Maximum allowed size of HTTP requests, in bytes. | `1000000`
`redirectFieldName` | Name of the HTML input that contains redirect URL address. | `"_redirect"`
`subject` | Email subject field content. Special entry `{{referrerUrl}}` will be changed to the address of the webpage from where the form is submitted. | `"Form submitted on {{referrerUrl}}"`
`reCaptchaSecret` | Site secret reCAPTCHA key. No captcha checks will be performed if this value is not set. | `""`
`requireReCaptchaResponse` | If true, receiver handler should always check g-recaptcha-response to be present in POST. | `false`
`assetsFolder` | Path to the folder containing static assets. | `"./assets"`
`databaseFileName` | Path to the SQLite database file. | `"./formmailer.db"`

## Redirect URL special field

HTML form can include special HTML input with name `_redirect`.

```html
<input type="hidden" name="_redirect" value="https://google.com">
```

FormMailer will redirect user to specified URL after the form is successfuly submitted. If `_redirect` field is ommited, user will be redirected to the default `thanks.html` page hosted by FormMailer.

## reCAPTCHA installation

To set up reCAPTCHA checking:

1. Sign up for reCAPTCHA (https://www.google.com/recaptcha/admin), get site key and secret key.

2. Write secret key value into `reCaptchaSecret` option in your config file.

3. Set configuration option `requireReCaptchaResponse` to true.

4. Set up reCAPTCHA integration on your static site HTML form.

    Refer to the link below on how to setup reCAPTCHA on the client side.

    https://developers.google.com/recaptcha/docs/display

## Deploying

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
ExecStart=/usr/bin/node ./dist/src/index.js -c ./config.json
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

$ # change the owner of the formmailer directory to the formmailer user
$ sudo chown formmailer:formmailer . -R

$ # force systemd to load the new service file
$ sudo systemctl daemon-reload

$ # start the service
$ sudo systemctl start formmailer
```

Don't forget to check your firewall settings to allow outside TCP connections to the port specified in `httpListenPort` setting.

*NOTE: FormMailer uses default NodeJS HTTP server. For production environment it is recommended to set up a reverse proxy (Nginx or alternative) that will hide FormMailer service from the outside world.*

## Alternatives

* [Formspree](https://github.com/formspree/formspree)
* [FormMailerService](https://github.com/abbr/FormMailerService)

## License

[MIT License](LICENSE)
