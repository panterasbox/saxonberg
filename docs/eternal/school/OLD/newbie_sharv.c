inherit ArmorCode;

void extra_create()
{
    set("id",({"sharv","shiny sharv","newbie armor"}) );
    set("short","a shiny metal sharv");
    set("long",
      "This tail sharv seems to be fresh from the forge.  It is made of "
      "a shiny metal.  It doesn't seem that thick, but it should offer "
      "some protection to your tail."
    );
    add("areas","tail");
    set("ac",1);
    set("weight",25);
    set("value",0);
}
