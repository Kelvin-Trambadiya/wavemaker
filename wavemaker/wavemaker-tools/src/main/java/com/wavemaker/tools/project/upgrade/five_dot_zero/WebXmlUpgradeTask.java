/*
 *  Copyright (C) 2008-2012 VMware, Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package com.wavemaker.tools.project.upgrade.five_dot_zero;

import java.io.IOException;
import java.io.InputStream;
import java.io.Writer;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.apache.commons.io.IOUtils;

import com.wavemaker.common.WMRuntimeException;
import com.wavemaker.tools.io.File;
import com.wavemaker.tools.project.Project;
import com.wavemaker.tools.project.ProjectConstants;
import com.wavemaker.tools.project.ProjectManager;
import com.wavemaker.tools.project.StudioFileSystem;
import com.wavemaker.tools.project.upgrade.UpgradeInfo;
import com.wavemaker.tools.project.upgrade.UpgradeTask;

/**
 * Backs up the current web.xml, and gives the user a message regarding that.
 * 
 * @author Matt Small
 */
public class WebXmlUpgradeTask implements UpgradeTask {

    protected static final String WEB_XML_BACKUP = ProjectConstants.WEB_XML + ".4_5_bak";

    @Override
    public void doUpgrade(Project project, UpgradeInfo upgradeInfo) {

        File webXml = project.getWebXmlFile();
        if (webXml.exists()) {
            try {
                File webXmlBak = project.getWebInfFolder().getFile(WEB_XML_BACKUP);
                webXmlBak.getContent().write(webXml);
                webXml.delete();
                File userWebXml = project.getWebInfFolder().getFile(ProjectConstants.USER_WEB_XML);
                InputStream resourceStream = this.getClass().getClassLoader().getResourceAsStream(ProjectManager._TEMPLATE_APP_RESOURCE_NAME);
                ZipInputStream resourceZipStream = new ZipInputStream(resourceStream);

                ZipEntry zipEntry = null;

                while ((zipEntry = resourceZipStream.getNextEntry()) != null) {
                    if ("webapproot/WEB-INF/user-web.xml".equals(zipEntry.getName())) {
                        Writer writer = userWebXml.getContent().asWriter();
                        IOUtils.copy(resourceZipStream, writer);
                        writer.close();
                    }
                }

                resourceZipStream.close();
                resourceStream.close();
            } catch (IOException e) {
                throw new WMRuntimeException(e);
            }

            upgradeInfo.addMessage("The web.xml file has changed.  If you have custom" + "modifications, please copy them from " + WEB_XML_BACKUP
                + " to the new user-web.xml.");
        }
    }

    public void setFileSystem(StudioFileSystem fileSystem) {
    }
}
