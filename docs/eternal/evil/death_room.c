#include "/zone/null/eternal/eternal.h"
inherit RoomCode;

void extra_create()
{
    set("short", "The death room");
    set("long", "This is where Dave keeps his corpses.  Get out.\n");
}

int query_enter_ok(object item, object foo)
{
    if(living(item) || interactive(item)) return 1;
}
