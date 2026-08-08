# Betty Blocks functions
Typescript flavoured betty functions! Enter `./src` and click on a function for various action steps.


## Requirements
Node only installation:
- Node V26.7.0

Recommended installation:
- nvm (latest)
- nvm zsh hook (Add to `~/.zshrc`)
```bash
autoload -U add-zsh-hook

load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_cat="$(cat "${nvmrc_path}")"

    # If regex match current version with .nvmrc then return
    if [[ $node_version =~ $nvmrc_cat ]]; then
        return 1
    fi

    local nvmrc_node_version=$(nvm version $nvmrc_cat)

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to NVM default version"
    nvm use default
  fi
}

add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

### First time setup
Installing packages:
```bash
npm install
```
Adding a `config.json` to the root file containing
```json
{
  "host": "https://example.bettyblocks.com",
  "applicationId": "<app_id>",
  "zone": "<app_zone>"
}
```

### Publish
```bash
npm run publish
```

### Recommended addition
Inside VSCode there is a schema option, this will allow you to autocomplete your function.json.
Navigate to the [VSCode settins JSON file](https://code.visualstudio.com/docs/getstarted/settings#_settings-json-file) and add the following:
```json
"json.schemas": [
    {
        "fileMatch": [
            "/functions/**/function.json",
        ],
        "url": "https://raw.githubusercontent.com/bettyblocks/json-schema/master/schemas/actions/function.json"
    }
],
```

![Screen_Recording_2025-02-10_at_23 10 51-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/23c8a978-ad50-4d51-a5f0-a00dc479fd87)
