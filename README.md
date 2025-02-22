
## Pre-requisites 

- OpenAI API key (Necessary if you use OpenAI LLM)
- Hugging Face API Key (Necessary if you use Hugging Face LLM)


#### OpenAI API Key

- Create an account with OpenAI if you haven't already.
- Create an API key at https://platform.openai.com/account/api-keys
- Copy the key somewhere safe.

#### Hugging Face API Key

- Create a hugging face account (https://huggingface.co)
- Generate an API key  (https://huggingface.co/settings/tokens)
- Copy the key somewhere safe

It's good to create separate API keys for separate projects/tools. That way if you need to disable a key for a project, you don't have to generate new keys for all your other projects.

## Quickstart - Running with docker-compose

Create a .env file in the langchain-testbench folder with your api keys and root pw.

Note that the MONGO_URL needs to point to `dkrcomp-mongo`.

```.env
MONGO_ROOT_PASSWORD=[mongo root pw, use a strong password you create]
OPENAI_API_KEY=[your openai API key]
MONGODB_URL=mongodb://testbench:testbench@dkrcomp-mongo:27017/testbench
MONGODB_DATABASE=testbench
HUGGINGFACEHUB_API_TOKEN=[your hugging face API key]
```

Create another .env file in the app folder.

```app/.env
VITE_SERVER_URL=http://localhost:4900
```

Then run:
```
docker-compose up
```

You can then use testbench at http://localhost:5173. Editing in the `server` or `lib` directory will automatically update the server, and editing `app/src` will automatically update the client.

## Setting up Mongo

Create an environment variable for `MONGO_ROOT_PASSWORD` and give it a value, or just replace %MONGO_ROOT_PASSWORD% in the command below. Note: If you used Quickstart above the `MONGO_ROOT_PASSWORD` you chose above must be the same

``` Launch-Mongo
cd into langchain-testbench folder
docker-compose up
```

In a separate command prompt window:

``` Launch-Mongo-Shell
docker exec -it dkrcomp-mongo mongosh -u mongoadmin -p %MONGO_ROOT_PASSWORD%  --authenticationDatabase admin
```
then at the new prompt run
``` Create-User
use testbench
db.createUser({user: "testbench", pwd: "testbench", roles: [{ role: "readWrite", db: "testbench" }]})
exit
```


## Generate ssh key for github

```
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

## Assuming key is placed in default id_rsa for following instructions.
## Change the file references below where necessary, if you change the default.
```

Go to the ssh keys page in github: https://github.com/settings/keys

Click "New SSH Key"

Give the key a title, choose "Authentication Key"

Then paste the content of the file ~/.ssh/id_rsa.pub into the "Key" textbox and click "Add SSH Key"

``` Setup ssh
ssh-keygen -R github.com
ssh -T git@github.com
```

## Create a virtual environment

``` Install-venv
cd into langchain-testbench folder
pip install virtualenv

python -m venv venv

## To activate the environment:
venv\Scripts\activate

## 
pip install -r requirements.txt
cd app
npm install
```

Create a .env file in the langchain-testbench folder with your api keys and root pw.

```.env
MONGO_ROOT_PASSWORD=[mongo root pw]
OPENAI_API_KEY=[your openai API key]
MONGODB_URL=mongodb://testbench:testbench@dkrcomp-mongo:27017/testbench
MONGODB_DATABASE=testbench
HUGGINGFACEHUB_API_TOKEN=[your hugging face API key]
```

Create another .env file in the app folder.

```app/.env
VITE_SERVER_URL=http://localhost:4900
```

## Running it

```
cd into langchain-testbench folder
docker-compose build
docker-compose up
```

URL is http://localhost:5173

## Vector Search

The vector search chain relies on SentenceTransformers which relies on PyTorch to run. This works well on Macs, but apparently not on Linux (Windows is an unkonwn). We've removed the PyTorch dependency by default so we can deploy on Linux. To regain vector search functionality uncomment:
```
# sentence-transformers==2.2.2 - uncomment for vector search
# torch==2.0.1 - uncomment for vector search
# torchvision==0.15.2 - uncomment for vector search
# transformers==4.31.0 - uncomment for vector search
```
In requirements.txt before building (or install these packages manually).
