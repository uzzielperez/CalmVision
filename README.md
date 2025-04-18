# README.md


# Database
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

```bash
brew install postgresql@15
```

```bash
brew services start postgresql@15
```

```bash
brew services restart postgresql@15
```

```bash
brew services stop postgresql@15
```


## Database Setup

Add this to your `.bashrc` or `.zshrc` file:
```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

To set up the PostgreSQL database for CalmVision:

```bash
❯ psql -U uzzielperez
psql (15.12 (Homebrew))
Type "help" for help.

uzzielperez=# CREATE DATABASE calmvision;
CREATE DATABASE
uzzielperez=# \l
                                                      List of databases
    Name     |    Owner    | Encoding |   Collate   |    Ctype    | ICU Locale | Locale Provider |      Access privileges      
-------------+-------------+----------+-------------+-------------+------------+-----------------+-----------------------------
 calmvision  | uzzielperez | UTF8     | en_US.UTF-8 | en_US.UTF-8 |            | libc            | 
 postgres    | uzzielperez | UTF8     | en_US.UTF-8 | en_US.UTF-8 |            | libc            | 
 template0   | uzzielperez | UTF8     | en_US.UTF-8 | en_US.UTF-8 |            | libc            | =c/uzzielperez             +
             |             |          |             |             |            |                 | uzzielperez=CTc/uzzielperez
 template1   | uzzielperez | UTF8     | en_US.UTF-8 | en_US.UTF-8 |            | libc            | =c/uzzielperez             +
             |             |          |             |             |            |                 | uzzielperez=CTc/uzzielperez
 uzzielperez | uzzielperez | UTF8     | en_US.UTF-8 | en_US.UTF-8 |            | libc            | 
(5 rows)

uzzielperez=# \c calmvision
You are now connected to database "calmvision" as user "uzzielperez".
calmvision=# 
```

## Tortoise
```bash
source /opt/homebrew/Caskroom/miniconda/base/etc/profile.d/conda.sh
conda activate tortoise
```
## Demo Status

See the live demo here: [https://calmvision.onrender.com/](https://calmvision.onrender.com/)