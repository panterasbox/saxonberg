#include "/zone/null/toys/tpa/tpa.h"
inherit TPAConsole;

void
extra_create()
{
  set_arrival("Eternal City");
  set_schedule("EC");
  room_setup("/zone/null/eternal/tpa/arrive.c");
  replace_program(TPAConsole);
  return;
} 
