inherit ArmorCode;


void extra_create()
{
    set("id",({"boots","shiny boots","newbie armor"}) );
    set("short","a pair of shiny metal boots");
    set("long",
      "These boots are so shiny, they must be brand new.  They are "
      "not very thick, but they appear to be well made.  At least "
      "they are far better than going around with bare feet.");
    set("weight",50);
    set("value",0);
    add("areas","left foot");
    add("areas","right foot");
    add("areas","left calf");
    add("areas","right calf");
    set("ac",1);
}

