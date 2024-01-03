int Init(char *initial_link_dir);
void Finish();
void down(char *buf, unsigned short bytes, unsigned short c64Addr);
void up(char *buf, unsigned short bytes, unsigned short c64Addr);
void Cont();
void JumpTo(unsigned short c64Addr);