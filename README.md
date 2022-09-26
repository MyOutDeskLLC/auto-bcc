<p align="center"><img src="./art/socialcard.png" alt="MyOutDesk, LLC"></p>

This extension is maintained by [MyOutDesk](https://www.myoutdesk.com/)

# Gmail Auto-Bcc Chrome Extension
This extension auto-populates the CC, BCC fields within gmail based on user-supplied rules. 

## Installation

[Download](https://chrome.google.com/webstore/detail/gmail-auto-bcc/ofegoambibneigpiejjadgfahhncpcoh)

## Development
Load unpacked extension point it to the `dist` folder

```
npm install
npm run dev
```

### How It Works
Gmail is a mess UI wise, so this is the approach we took:

1. Extension runs on page and attaches a MutationObserver to scan for DOM changes that add a new form with the class `bAs`
2. When we see that form show up, we know that a new compose or reply has been initiated
3. Locate, by examining random UI hints (using aria-label, for instance) the parents of TO, CC, and BCC within that new form
4. Find existing "cards" (aka recipients in any field) which already exist in those fields. This is because they are clickable, hoverable, etc.
5. Attach mutation observers to watch for new inputs \ new cards which may show up in the `To` field
6. Populate the CC, BCC based on the existing To field, or populate when a recipient is added

Hopefully this provides a long lasting solution without much pain. You can review the entire code [here](./src/gmail.js)

### Building For Distribution
You can build this extension by running:
```
npm run build
```

## Contributing

Submit a PR.

## Credits

- [JL](https://github.com/WalrusSoup)
- [Tance77](https://github.com/tance77)
- [All Contributors](../../contributors)

## License

The Mostly MIT License (MMIT). Please see [License File](LICENSE.md) for more information.
