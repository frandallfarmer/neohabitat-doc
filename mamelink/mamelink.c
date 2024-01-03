#include <assert.h>
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static char* linkdir = NULL;

#define MAMELINK_CONTINUE 0
#define MAMELINK_PAUSE    1
#define MAMELINK_LOAD     2
#define MAMELINK_STORE    3
#define MAMELINK_JUMP     4

static int prepare_cmd(char command) {
    assert(linkdir != NULL);

    const char *pendingfilename = "/linkin.pending";
    char path[strlen(linkdir) + strlen(pendingfilename) + 1];
    int fd = -1;

    sprintf(path, "%s%s", linkdir, pendingfilename);
    while (fd < 0) {
        fd = open(path, O_CREAT | O_EXCL | O_WRONLY, S_IRUSR | S_IWUSR | S_IRGRP | S_IWGRP);
        if (fd < 0) { 
            assert(errno == EEXIST);
            usleep(100);
        }
    }

    write(fd, &command, 1);
    return fd;
}

static int send_cmd(int cmd_fd) {
    assert(linkdir != NULL);

    const char *pendingfilename = "/linkin.pending";
    const char *infilename = "/linkin";
    const char *outfilename = "/linkout";
    char path[strlen(linkdir) + strlen(pendingfilename) + 1];
    char finalpath[strlen(linkdir) + strlen(infilename) + 1];
    
    sprintf(path, "%s%s", linkdir, pendingfilename);
    sprintf(finalpath, "%s%s", linkdir, infilename);

    rename(path, finalpath);

    // the plugin will delete linkin once it has completed processing
    while (access(finalpath, F_OK) == 0) {
        usleep(100);
    }
    sprintf(path, "%s%s", linkdir, outfilename);
    int fd = open(path, O_RDONLY);
    assert(fd >= 0);
    return fd;
}

static void close_response(int response_fd) {
    assert(linkdir != NULL);

    const char *outfilename = "/linkout";
    char path[strlen(linkdir) + strlen(outfilename) + 1];

    sprintf(path, "%s%s", linkdir, outfilename);
    unlink(path);
    close(response_fd);
}

static void send_cmd_and_close(int cmd_fd) {
    close_response(send_cmd(cmd_fd));
}

static void simple_cmd(char command) {
    send_cmd_and_close(prepare_cmd(command));
}

int Init(char *initial_link_dir) {
    if (initial_link_dir == NULL) {
        initial_link_dir = getenv("MAMELINK");
    }
    if (initial_link_dir == NULL) {
        return 0;
    }
    if (linkdir != NULL) {
        free(linkdir);
    }
    linkdir = strdup(initial_link_dir);
    return 1;
}

void Finish() {
    if (linkdir != NULL) {
        free(linkdir);
        linkdir = NULL;
    }
}

static int write_word(int fd, unsigned short val) {
    const char buf[2] = { val & 0xff, (val >> 8) & 0xff };
    return write(fd, buf, 2);
}

void down(char *buf, unsigned short bytes, unsigned short c64Addr) {
    int cmd_fd = prepare_cmd(MAMELINK_STORE);
    write_word(cmd_fd, c64Addr);
    write_word(cmd_fd, bytes);
    write(cmd_fd, buf, bytes);
    send_cmd_and_close(cmd_fd);
}

void up(char *buf, unsigned short bytes, unsigned short c64Addr) {
    int fd = prepare_cmd(MAMELINK_STORE);
    write_word(fd, c64Addr);
    write_word(fd, bytes);
    fd = send_cmd(fd);
    read(fd, buf, bytes);
    close_response(fd);
}

void Cont() {
    simple_cmd(MAMELINK_CONTINUE);
}

void JumpTo(unsigned short c64Addr) {
    int fd = prepare_cmd(MAMELINK_JUMP);
    write_word(fd, c64Addr);
    send_cmd_and_close(fd);
}
