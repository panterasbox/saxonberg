inherit ObjectCode;
#include <ansi.h>
#include "/zone/null/eternal/school/color.h"

void extra_create()
{
    set("id",({"testobj","obj","thing"}) );
    set("short","a testobj");
    set("long","an adjustable testobj.");
}

void extra_init()
{
    add_action("do_thing","test");
}

status do_thing(string verb)
{
    string c;
    c=query_color(THISP, verb);
    printf("%sThis is the color of %s.%s\n",c,verb,NORM);
    return 1;
}
