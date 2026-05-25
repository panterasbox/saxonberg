#define DURATION 100000
inherit "/zone/null/eternal/magic/potioncode";
object shad;

extra_create()
{
    set_look("glowing white");
    set_value(500);
    set_uses(2);
    set_name("invisibility potion");
    set_id_short("A potion of invisibility.");
}

drink()
{
    int s;
    tell_object(THISP,"You feel cold.\n");
    tell_room(ENV(THISP),CPRNAME+" drinks a potion and fades out of view.\n", ({THISP}));
    seteuid(getuid());
    shad = clone_object("/zone/null/eternal/magic/invis_shadow");
    shad->activate(THISP);
    s = (int)THISP->query_stat("con");
    s = DURATION/(s+300);
    shad->countdown(s);
    return(1);
}
