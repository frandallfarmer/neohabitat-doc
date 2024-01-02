// A recreation of the "down" tool used by fred. Expects an object file
// following the "slinky" object format, piped to stdin. 
// https://github.com/ssalevan/habiclient/blob/master/Tools/slinky/link.c

#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <unistd.h>
#include "mamelink.h"

typedef unsigned char	byte;
typedef unsigned short	word;

byte buf[64 * 1024];

size_t tryreadbytes(size_t count) {
    size_t readcount = 0;
    while (readcount < count) {
        ssize_t result = read(STDIN_FILENO, buf + readcount, count);
        readcount += result;
        assert(result >= 0);
        if (result == 0) {
            break;
        }
    }
    return readcount;
}

void readbytes(size_t count) {
    assert(tryreadbytes(count));
}

word readword() {
    readbytes(2);
    return (unsigned short)buf[0] | ((unsigned short)buf[1] << 8);
}

bool tryreadword(word *val) {
    if (tryreadbytes(2) != 2) {
        return false;
    } else {
        *val = (unsigned short)buf[0] | ((unsigned short)buf[1] << 8);
        return true;
    }
}

word entryPoint = 0;

void sendAbsoluteSegments() {
    while (true) {
        word start;
        if (!tryreadword(&start) || start == 0xffff) {
            break;
        }
        word end = readword();
        assert(end >= start);

        word count = end - start + 1;
        readbytes(count);
        printf("Segment: %4x-%4x\n", start, end);
        down(buf, count, start);
        if (start == end) {
            entryPoint = start;
        }
    }
}

void sendRelocatableSegments() {
    // hope Slinky has already pre-relocated all segments??
    word start;
    assert(!tryreadword(&start) || start == 0xffff);
}

int main(int argc, char *argv) {

    Init(NULL);

    // object starts with "magic" divider
    assert(readword() == 0xffff);

    sendAbsoluteSegments();
    sendRelocatableSegments();

    if (entryPoint != 0) {
        printf("SYS%d\n", entryPoint);
        JumpTo(entryPoint);
    }

    Finish();

    return 0;
}