Getting Started
===============

We're rebuilding the world's first MMO, brick by brick, and we're over the moon
to have you on board. We wanted to make it fast and easy to get started, and in
our experience you can go from nothing to a fully-functional development
environment in under 20 minutes. Simply follow this guide and you'll be on your
way to contributor status before you know it.

Overview
--------

There are five services that must be established to run Neohabitat:

-   Neohabitat server (based on [Elko](https://github.com/FUDCo/Elko))

-   Neohabitat-to-Habitat protocol bridge (converts Neohabitat messages into
    binary packets compatible with the QuantumLink protocol)

-   [MongoDB](https://www.mongodb.com/) (to persist Neohabitat data)

-   [QuantumLink Reloaded server](https://github.com/ssalevan/qlink)
    (reconstructs the original 1980s
    [QuantumLink](https://en.wikipedia.org/wiki/Quantum_Link) service, proxying
    Habitat packets to Commodore 64 clients)

-   [MySQL](https://www.mysql.com/) (to persist QuantumLink Reloaded data)

To expedite the setup procedure, we've created a [Docker
Compose](https://docs.docker.com/compose/) setup script which will setup these
services and provide for swift iteration.

**IMPORTANT**

If you are using the launcher from [Neohabitat.zip](https://github.com/frandallfarmer/neohabitat-doc/blob/master/installers/Neohabitat.zip?raw=true) then your port should always be set to 1986. You should only use 5190 if you want to connect to Habitat through the outdated Q-Link method.

Step 1 - Install Docker ~~or Vagrant~~
----------------------------------    

NOTE: The Vagrant installation path is obsolete and currently unsupported. Please look at the documentation from commit 148fae48ff215bc18de9b45f3f4ac1576d4e42a4 or earlier if you want to work to restore this method)

To take advantage of the Neohabitat automation, you'll need to install either
**Docker and Docker Compose**. You can do so by following one of
the following guides:

**Windows**

The windows server has been tested with Docker-Desktop running under WSL2 (Ubuntu)

Follow the instructions here:

-   [Install WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) Choose the default unix distro (Ubuntu)
-   [Install Docker Desktop for Windows](https://docs.docker.com/desktop/wsl/)
-   [Install curl](https://curl.haxx.se/download.html)

**OS X**

Follow the instructions here:

-   [Docker for Mac](https://docs.docker.com/docker-for-mac/)

Next, follow the **Docker variant** of Step 2.

**Linux**

Follow the instructions here:

-   [Docker for
    Ubuntu](https://docs.docker.com/engine/installation/linux/ubuntulinux/)

-   [Docker for
    CentOS](https://docs.docker.com/engine/installation/linux/centos/)

-   [Docker for
    Fedora](https://docs.docker.com/engine/installation/linux/fedora/)

Next, follow the **Docker variant** of Step 2.

Step 2 - Build and Start Neohabitat Services (with Docker)
----------------------------------------------------------

Now that you've installed Docker, you can configure the neohabitat environment
with a single command:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ bash
./boostrap
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This will clean out any existing Docker instances and make sure the environment
is configured to compile and run the Habitat processes.

The first time you start up, use the following command:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ bash
./recreate -b
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

from then on, if you make any changes and want to recompile/restart the services, use
this command instead:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ bash
docker-compose up
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Docker Compose will proceed to pull the images for all dependent services then
launch the Neohabitat build process. This will take approximately 10 minutes
upon the first build; all subsequent launches will be near-instantaneous. You'll
see the following log output when this process has completed:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
qlink_1       | 2017-01-14 08:47:49,035 [main] INFO  org.jbrain.qlink.QLinkServer  - Starting server
qlink_1       | 2017-01-14 08:47:49,065 [main] INFO  org.jbrain.qlink.QLinkServer  - Listening on 0.0.0.0:5190
qlink_1       | 2017-01-14 08:47:49,089 [main] DEBUG org.jbrain.qlink.chat.RoomManager  - Creating default Lobby
qlink_1       | 2017-01-14 08:47:49,094 [main] DEBUG org.jbrain.qlink.chat.AbstractRoomDelegate  - Creating locked public room: Lobby
qlink_1       | 2017-01-14 08:47:49,096 [main] DEBUG org.jbrain.qlink.chat.RoomManager  - Adding room 'Lobby' to public room list
qlink_1       | 2017-01-14 08:47:49,101 [main] DEBUG org.jbrain.qlink.chat.RoomManager  - Creating Auditorium
qlink_1       | 2017-01-14 08:47:49,106 [main] DEBUG org.jbrain.qlink.chat.AbstractRoomDelegate  - Creating locked private room: Auditorium
qlink_1       | 2017-01-14 08:47:49,112 [main] DEBUG org.jbrain.qlink.chat.RoomManager  - Adding room 'Auditorium' to private room list
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Docker Compose will proxy the following service ports to localhost:

-   **1337**: Habitat protocol bridge

-   **3307**: MariaDB (open source MySQL) server

-   **5190**: QuantumLink Reloaded server

-   **9000**: Neoclassical Habitat Elko server

-   **27017**: MongoDB server

The Neohabitat repository will be linked into the /neohabitat directory of the
'neohabitat' container. You can get to a Bash console on this container (based
on EL7) by running the following command:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ bash
docker-compose exec neohabitat /bin/bash
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you wish to restart the Neohabitat server after making a code change, be
certain that you've built a new JAR locally via the `./build` command then
restart Neohabitat with the following command:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ bash
docker-compose restart neohabitat
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



Step 3 - Download and Configure Vice
------------------------------------

**Windows**

- Download [Neohabitat.zip](https://github.com/frandallfarmer/neohabitat-doc/blob/master/installers/Neohabitat.zip?raw=true)

- Unzip onto the desktop
	- (This is not yet an installer. Want to help build one? Join us at https://discord.gg/nk7HwAGF)
	
- Open the Neohabitat folder

- Edit the file named **vice.ini**

- Set **RsDevice1** to **"127.0.0.1:1986"**

- Double-click the **Launch Habitat** icon.
	- If double clicking on the launcher does not work, try running it as administrator. If you are still encountering issues then scroll down to the "Help!" section of the readme for other alternatives.

**OS X**

- Download [Neohabitat.dmg](https://github.com/frandallfarmer/neohabitat-doc/blob/master/installers/Neohabitat.dmg?raw=true) and double-click on the DMG file.

- Drag the **Neohabitat** application to the **Applications** folder.

- **Launch the Neohabitat application** you dragged to **Applications**.

**Please Note**: OS X may inform you that this app comes from an unknown developer upon first launch. If this happens, **open System Preferences** and click **Security & Privacy**. From the following pane, click **Open Anyway** to launch the Neohabitat application.

**Linux and \*BSD**

- Install VICE and `nc` (netcat) via your package manager
- Extract the Windows release of [Neohabitat.zip](https://github.com/frandallfarmer/neohabitat-doc/blob/master/installers/Neohabitat.zip?raw=true) to get the `.d64` files and `fliplist-C64.vfl`
- Run the VICE C64 emulator with these options set:  
  `x64 -rsuser -rsuserdev 0 -rsdev1 '|nc 127.0.0.1 1986' -rsuserbaud 1200 -flipname fliplist-C64.vfl Habitat-Boot.d64`


**Keyboard (Joystick Emulation)**

-   If you haven't launched the Neohabitat application in the last step, do it now.  

-   Go to **Settings -\> Joystick Settings -\> (Check) Enable Joy Keys**

-   Go to **Settings -\> Joystick Settings -\> Joystick Settings**

-   Select the **Joystick \#1** drop-down and choose **Keyset A**

-   Select the **Configure Keyset A** button.

-   One button at a time, select the **South, West, East, North**, and **Fire**
    buttons; assigning a key to each button. If available it is suggested to use
    your numeric keypad buttons as to not interfere with typing text in the
    client.

-   Click **OK, OK**

**Joystick**

You can use a wired, wireless, or Bluetooth joystick which is PC compatible but
it must be plugged in prior to opening the WinVice client. If you have never
used the device on your current PC previously, you may need to run the
**Joystick Calibration Wizard** in the **Windows Control Panel** under **Devices
and Printers** before Vice will recognize the joystick.

Once your Joystick is plugged in and calibrated:

-   Double-click the **Launch Habitat** icon.

-   Go to **Settings -\> Joystick Settings -\> Joystick Settings**

-   Select the **Joystick \#1** drop-down and choose your joystick from the list

    Note: If you do not see your joystick listed, select the **Calibrate
    Joystick** button and verify it is detected by Windows; then run the
    **Calibration Wizard** to ensure a profile is created for the joystick.
    After this is done, you may need to exit and re-launch WinVice.

Congrats! After doing all of this you should now have the bare necessities to run your own local server. 

Step 4 - Building Neohabitat Locally and IDE Integration
-----------------------------------------------------------

You have a choice of using Eclipse or IntelliJ for your dev environment. 

**IDEs**

Follow the instructions here:

-   [Eclipse](https://www.eclipse.org/)

-   [IntelliJ](https://www.jetbrains.com/idea/)


Maven is used for importing Neohabitat into your IDE and building your code.

You can download it [here](https://maven.apache.org/index.html).

After installing Maven **import** the root pom.xml into Eclipse or IntelliJ to gain full IDE integration.

After making a change, type this line in your neohabitat directory to build your code.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ bash
mvn package -e
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You'll also want to run a local build when you've completed a code change and
are ready to reload Neohabitat.

Conclusion
----------

We hope that this guide helped you to get acquainted with Neohabitat and its
services and we're looking forward to working with you! If you have any
questions or concerns, feel free to ask them in the [Neohabitat
Discord](https://discord.gg/nk7HwAGF).

Have fun and happy hacking!
