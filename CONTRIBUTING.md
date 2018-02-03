## How to contribute

Run FormMailer in development mode:

1. Install NodeJS and yarn (with `npm install -g yarn`), clone this repo and install dependencies with `yarn install` command.

2. Change options in development config file `test/config.test.json` if you wish so. Defaults should work as they are.

3. Start FormMailer in the development mode:
    ```bash
    $ yarn live
    ```
    This will start three processes and share terminal stdout/stderr between them:
    * [SMTP] Mock SMTP server that outputs all received emails to stdout.
    * [HTTP] HTTP server that serves files from `./test` folder (and opens `./test/index.html` in browser)
    * [FM] FormMailer in hot-reloading mode (process will restart after you edit any TS sources).

4. Page 'http://127.0.0.1:8080/index.html' will be automatically opened in your browser. Try to submit the form. If your setup is working correctly, you should see the contents of the email with posted data in terminal output.

5. Hack away, run `yarn test` to make sure that tests are passing, submit a PR when ready!
