# Tescrex

wow im so good at names

## but what is Tescrex?

im glad you asked! it's an extension for google chrome that acts as a **TE**st **SCR**ipt **EX**ecutor

## wow that name is garbage

thanks!

basically, ive created a very very basic "scripting language" (if it can even be called that). you can use it to create a script that will then be executed on the page!

## ok but where's the docs

```
LOG <text> - creates a log entry
GOTO <url> - goes to the specific webpage
CLICK <selector> - clicks a specific element on the page, using querySelector
EVAL <code> - evaluates raw js code
SLEEP <ms> - pauses execution for the specified number of milliseconds
```

so if you wanted to go to google, wait five seconds, go to bing, wait five seconds, and then go back to the superiour search engine, you could do this:
```
LOG going to google
GOTO https://google.com
SLEEP 5000
LOG going to bing
GOTO https://bing.com
SLEEP 5000
LOG going back to google
GOTO https://google.com
SLEEP 1000
LOG enjoy your day!
```

the last two lines are optional, but a bit of politeness never hurts

## ok but how do i use it?

1. clone this repo
2. load the src directory as an unpacked extension
3. click the little gear doodad in the search bar thingy
4. go to "options"
5. it should be fairly self explanatory what you do here
